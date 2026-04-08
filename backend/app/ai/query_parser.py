from __future__ import annotations

import json
from typing import Any

from backend.app.ai.client import call_claude
from backend.app.models.race import Race

SYSTEM_PROMPT_TEMPLATE = """\
You are a query parser for the WhatIf-1 Formula 1 simulation app. Convert the \
user's natural language question about an F1 race into a structured JSON command.

You must return ONLY valid JSON, no other text.

There are two query types:

TYPE 1: "forward" -- the user wants to simulate a specific change
Return:
{{
  "type": "forward",
  "scenario": {{
    "pit_overrides": {{...}} or null,
    "event_overrides": [...] or null,
    "weather_overrides": [...] or null,
    "driver_overrides": {{...}} or null,
    "race_param_overrides": {{...}} or null,
    "description": "human-readable description"
  }}
}}

TYPE 2: "solve" -- the user wants to know what conditions would be needed
Return:
{{
  "type": "solve",
  "goal": {{
    "goal_type": "beat|win|podium|points|position",
    "driver": "3-letter driver code",
    "target_driver": "3-letter code or null",
    "target_position": null,
    "parameter": "pace_offset|pit_lap_1|pit_lap_2|tyre_compound",
    "search_range": [min, max]
  }}
}}

TYPE 3: "analysis" -- the user wants comparative analysis, not a simulation
Return:
{{
  "type": "analysis",
  "analysis": {{
    "question_type": "who_benefited_most|optimal_strategy|compare_strategies",
    "subject_driver": "3-letter code or null",
    "event_focus": "event_id or null",
    "description": "what to analyze"
  }}
}}

Available driver codes for this race:
{driver_codes}

Available events for this race:
{events_list}\
"""

USER_PROMPT_TEMPLATE = """\
Race context: {race_name} ({year}), {total_laps} laps at {circuit_name}
Winner: {winner}

User's question:
"{user_question}"\
"""

ERROR_RESPONSE = {
    "type": "error",
    "message": (
        "I couldn't understand that question. Try asking something like "
        "'What if Norris pitted on lap 20 instead?' or "
        "'What would Verstappen need to win?'"
    ),
}


def _get_driver_codes(race: Race) -> str:
    """Extract driver codes from a race's driver entries."""
    codes: list[str] = []
    for entry in race.driver_entries:
        codes.append(f"{entry.driver_id} ({entry.driver_name}, {entry.team_name})")
    return "\n".join(codes) if codes else "No drivers available"


def _get_events_list(race: Race) -> str:
    """Extract race events into a readable list."""
    lines: list[str] = []
    for event in race.race_events:
        lines.append(
            f"- {event.event_id}: {event.event_type} "
            f"(laps {event.lap_start}-{event.lap_end})"
        )
    return "\n".join(lines) if lines else "No events recorded"


def _get_winner(race: Race) -> str:
    """Get the winner's driver code from driver entries."""
    for entry in race.driver_entries:
        if entry.finish_position == 1:
            return entry.driver_id
    return "Unknown"


def _validate_parsed(parsed: dict[str, Any]) -> bool:
    """Basic structural validation of parsed query."""
    query_type = parsed.get("type")
    if query_type == "forward":
        return "scenario" in parsed and isinstance(parsed["scenario"], dict)
    if query_type == "solve":
        return "goal" in parsed and isinstance(parsed["goal"], dict)
    if query_type == "analysis":
        return "analysis" in parsed and isinstance(parsed["analysis"], dict)
    return False


def parse_query(question: str, race: Race) -> dict[str, Any]:
    """Parse a natural language question into structured simulation parameters.

    Args:
        question: The user's natural language question.
        race: The Race ORM object with loaded driver_entries and race_events.

    Returns:
        Parsed dict with type and structured parameters, or error dict.
    """
    circuit_name = race.circuit.name if race.circuit else "Unknown Circuit"

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        driver_codes=_get_driver_codes(race),
        events_list=_get_events_list(race),
    )

    user_prompt = USER_PROMPT_TEMPLATE.format(
        race_name=race.name,
        year=race.year,
        total_laps=race.total_laps,
        circuit_name=circuit_name,
        winner=_get_winner(race),
        user_question=question,
    )

    raw = call_claude(system_prompt, user_prompt)
    if not raw:
        return ERROR_RESPONSE

    # Strip markdown code fences if present
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (code fences)
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return ERROR_RESPONSE

    if not isinstance(parsed, dict) or not _validate_parsed(parsed):
        return ERROR_RESPONSE

    return parsed
