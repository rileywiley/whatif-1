from __future__ import annotations

from typing import Any

from backend.app.ai.client import call_claude
from backend.app.models.race import Race
from backend.app.models.scenario import Scenario

SYSTEM_PROMPT = """\
You are a Formula 1 race analyst for the WhatIf-1 app. You explain alternative \
race outcomes in a clear, engaging style that both hardcore fans and newcomers \
can understand.

Rules:
- Write 2-4 sentences maximum
- Lead with the most dramatic change (e.g., "Norris wins instead of Leclerc")
- Explain the causal chain: what the modification changed -> what cascade it \
caused -> final result
- Use specific numbers (lap times, gaps, positions) when they strengthen the story
- Name drivers by surname only (Norris, not Lando Norris)
- Never use hedging language ("might have", "could have"). Speak as if \
describing what DID happen in the simulation.
- If the scenario has low confidence (<0.5), add a brief caveat at the end.\
"""

USER_PROMPT_TEMPLATE = """\
Race: {race_name} ({year})
Circuit: {circuit_name}

Scenario modifications:
{modifications_list}

Actual finish order (top 10):
{actual_order}

Simulated finish order (top 10):
{simulated_order}

Key position changes:
{position_changes}

Key divergence lap: {divergence_lap}
Confidence: {confidence_score}

Write a race analysis explaining why the outcome changed.\
"""


def _format_modifications(scenario: Scenario) -> str:
    """Build a human-readable list of scenario modifications."""
    lines: list[str] = []
    if scenario.pit_overrides:
        for driver, overrides in scenario.pit_overrides.items():
            lines.append(f"- {driver} pit overrides: {overrides}")
    if scenario.event_overrides:
        for override in scenario.event_overrides:
            action = override.get("action", "MODIFY")
            event_id = override.get("event_id", "unknown")
            lines.append(f"- {action} event {event_id}")
    if scenario.weather_overrides:
        for override in scenario.weather_overrides:
            lines.append(f"- Weather change: {override}")
    if scenario.driver_overrides:
        for driver, overrides in scenario.driver_overrides.items():
            lines.append(f"- {driver} driver overrides: {overrides}")
    if scenario.race_param_overrides:
        lines.append(f"- Race param overrides: {scenario.race_param_overrides}")
    if scenario.description:
        lines.append(f"- Description: {scenario.description}")
    return "\n".join(lines) if lines else "- No modifications"


def _format_finish_order(order: list[dict[str, Any]]) -> str:
    """Format a finish order list into a readable string."""
    parts: list[str] = []
    for i, entry in enumerate(order[:10], 1):
        driver_id = entry.get("driver_id", "???")
        parts.append(f"{i}.{driver_id}")
    return " ".join(parts)


def _format_position_changes(diff_summary: dict[str, Any]) -> str:
    """Format position change data into readable lines."""
    lines: list[str] = []
    changes = diff_summary.get("position_changes", {})
    for driver_id, change_info in changes.items():
        if isinstance(change_info, dict):
            actual = change_info.get("actual_position", "?")
            simulated = change_info.get("simulated_position", "?")
            delta = change_info.get("delta", 0)
            sign = "+" if delta > 0 else ""
            lines.append(
                f"- {driver_id}: P{actual} -> P{simulated} ({sign}{delta})"
            )
        elif isinstance(change_info, int) and change_info != 0:
            sign = "+" if change_info > 0 else ""
            lines.append(f"- {driver_id}: ({sign}{change_info})")
    return "\n".join(lines) if lines else "- No significant position changes"


def generate_narrative(
    race: Race,
    scenario: Scenario,
    sim_result_dict: dict[str, Any],
) -> str:
    """Generate an AI narrative for a simulation result.

    Args:
        race: The Race ORM object.
        scenario: The Scenario ORM object with overrides.
        sim_result_dict: Dict containing finish_order, diff_summary,
            key_divergence_lap, confidence_score, and optionally
            actual_finish_order.

    Returns:
        Narrative string from Claude, or empty string if API unavailable.
    """
    circuit_name = race.circuit.name if race.circuit else "Unknown Circuit"

    actual_order = sim_result_dict.get("actual_finish_order", [])
    simulated_order = sim_result_dict.get("finish_order", [])
    diff_summary = sim_result_dict.get("diff_summary", {})
    divergence_lap = sim_result_dict.get("key_divergence_lap", "N/A")
    confidence = sim_result_dict.get("confidence_score", 0.0)

    user_prompt = USER_PROMPT_TEMPLATE.format(
        race_name=race.name,
        year=race.year,
        circuit_name=circuit_name,
        modifications_list=_format_modifications(scenario),
        actual_order=_format_finish_order(actual_order),
        simulated_order=_format_finish_order(simulated_order),
        position_changes=_format_position_changes(diff_summary),
        divergence_lap=divergence_lap,
        confidence_score=f"{confidence:.2f}",
    )

    return call_claude(SYSTEM_PROMPT, user_prompt)
