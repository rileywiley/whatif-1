from __future__ import annotations

import json
from typing import Any

from backend.app.ai.client import call_claude
from backend.app.models.race import Race

SYSTEM_PROMPT = """\
You are a Formula 1 strategy analyst. Given a race's events and results, \
suggest the 2-3 most interesting "what if" scenarios that would produce \
dramatically different outcomes.

Rules:
- Focus on scenarios with high dramatic impact (winner changes, multiple \
position swaps)
- Prefer scenarios that involve real race events (safety cars, weather, \
penalties) over hypothetical pace changes
- Each suggestion should be a single sentence question starting with \
"What if..."
- Include a brief impact summary (1 sentence)
- Return valid JSON only

Return format:
{
  "suggestions": [
    {
      "description": "What if ...?",
      "impact_summary": "...",
      "scenario_params": { ... }
    }
  ]
}\
"""

USER_PROMPT_TEMPLATE = """\
Race: {race_name} ({year})
Circuit: {circuit_name}
Total laps: {total_laps}

Finish order (top 10):
{finish_order}

Race events:
{events_list}

Key pit stop data:
{pit_data}

Suggest 2-3 interesting what-if scenarios for this race.\
"""


def _format_finish_order(race: Race) -> str:
    """Format actual finish order from driver entries."""
    entries = sorted(
        [e for e in race.driver_entries if e.finish_position is not None],
        key=lambda e: e.finish_position,  # type: ignore[arg-type]
    )
    lines: list[str] = []
    for entry in entries[:10]:
        lines.append(
            f"P{entry.finish_position} {entry.driver_id} "
            f"({entry.team_name}) - {entry.status}"
        )
    return "\n".join(lines) if lines else "No finish data"


def _format_events(race: Race) -> str:
    """Format race events list."""
    if not race.race_events:
        return "No notable events"
    lines: list[str] = []
    for event in race.race_events:
        detail = f" - {event.details}" if event.details else ""
        trigger = (
            f" (triggered by {event.trigger_driver_id})"
            if event.trigger_driver_id
            else ""
        )
        lines.append(
            f"- {event.event_type} laps {event.lap_start}-{event.lap_end}"
            f"{trigger}{detail}"
        )
    return "\n".join(lines)


def _format_pit_data(race: Race) -> str:
    """Format key pit stop information from driver entries."""
    lines: list[str] = []
    for entry in race.driver_entries:
        if entry.pit_stops:
            stops = ", ".join(
                f"lap {ps.lap_number} ({ps.tyre_compound_to})"
                for ps in entry.pit_stops
            )
            lines.append(f"- {entry.driver_id}: {stops}")
    return "\n".join(lines) if lines else "No pit stop data"


def generate_suggestions(race: Race) -> list[dict[str, Any]]:
    """Generate AI-suggested what-if scenarios for a race.

    Args:
        race: The Race ORM object with loaded relationships.

    Returns:
        List of suggestion dicts with description, impact_summary,
        and scenario_params.
    """
    circuit_name = race.circuit.name if race.circuit else "Unknown Circuit"

    user_prompt = USER_PROMPT_TEMPLATE.format(
        race_name=race.name,
        year=race.year,
        circuit_name=circuit_name,
        total_laps=race.total_laps,
        finish_order=_format_finish_order(race),
        events_list=_format_events(race),
        pit_data=_format_pit_data(race),
    )

    raw = call_claude(SYSTEM_PROMPT, user_prompt)
    if not raw:
        return []

    # Strip markdown code fences if present
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return []

    if isinstance(parsed, dict) and "suggestions" in parsed:
        return parsed["suggestions"]
    if isinstance(parsed, list):
        return parsed

    return []
