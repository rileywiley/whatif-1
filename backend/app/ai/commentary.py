from __future__ import annotations

from typing import Any

from backend.app.ai.client import call_claude
from backend.app.models.race import Race
from backend.app.models.scenario import Scenario, SimResult

SYSTEM_PROMPT = """\
You are a Formula 1 race commentator providing lap-by-lap analysis for a \
simulated race in the WhatIf-1 app.

Rules:
- Write exactly 1-2 sentences per lap
- Focus on the most interesting thing happening THIS lap: a gap closing, an \
overtake, a pit stop, tyres falling off a cliff, a strategy paying off
- Use present tense as if watching the race live
- Reference specific numbers (gap, lap time, tyre age) to ground the commentary
- On laps where nothing notable happens, note the status quo briefly \
("Norris maintains a steady 3.2s lead, both drivers managing their tyres")
- Never repeat the same observation on consecutive laps\
"""

USER_PROMPT_TEMPLATE = """\
Race: {race_name} (simulated, {scenario_description})
Lap {lap_number} of {total_laps}

Current standings:
{position_tower}

This lap's key data:
- Fastest on track: {fastest_driver} ({fastest_time})
- Biggest gap change: {gap_change_driver} ({gap_direction} {gap_amount}s on \
{target_driver})
- Pit stops this lap: {pit_events}
- Active event: {active_event_or_none}
- Weather: {weather_state}

Previous lap commentary: "{previous_commentary}"

Write lap {lap_number} commentary.\
"""


def _build_position_tower(
    sim_result: SimResult | None, lap_number: int
) -> tuple[str, list[dict[str, Any]]]:
    """Build a position tower string and data for a given lap.

    Returns:
        Tuple of (formatted position tower string, position data list).
    """
    if sim_result is None:
        return "No simulation data available", []

    position_history = sim_result.position_history or {}
    simulated_laps = sim_result.simulated_laps or {}

    # Build per-driver state for this lap
    driver_states: list[dict[str, Any]] = []
    for driver_id, positions in position_history.items():
        if isinstance(positions, list) and lap_number - 1 < len(positions):
            position = positions[lap_number - 1]
        elif isinstance(positions, dict) and str(lap_number) in positions:
            position = positions[str(lap_number)]
        else:
            continue

        lap_time = None
        tyre_age = None
        gap_to_leader = None
        compound = None

        driver_laps = simulated_laps.get(driver_id, [])
        if isinstance(driver_laps, list):
            for lap_data in driver_laps:
                if isinstance(lap_data, dict) and lap_data.get("lap_number") == lap_number:
                    lap_time = lap_data.get("lap_time")
                    tyre_age = lap_data.get("tyre_age")
                    gap_to_leader = lap_data.get("gap_to_leader")
                    compound = lap_data.get("compound")
                    break

        driver_states.append({
            "driver_id": driver_id,
            "position": position,
            "lap_time": lap_time,
            "tyre_age": tyre_age,
            "gap_to_leader": gap_to_leader,
            "compound": compound,
        })

    driver_states.sort(key=lambda d: d["position"] if d["position"] else 99)

    lines: list[str] = []
    for ds in driver_states[:10]:
        gap_str = f"+{ds['gap_to_leader']:.1f}s" if ds.get("gap_to_leader") else "LEADER"
        time_str = f"{ds['lap_time']:.3f}" if ds.get("lap_time") else "N/A"
        compound_str = ds.get("compound", "?")
        age_str = f"{ds['tyre_age']}L" if ds.get("tyre_age") is not None else "?"
        lines.append(
            f"P{ds['position']} {ds['driver_id']} | "
            f"{gap_str} | {time_str} | {compound_str} ({age_str})"
        )

    return "\n".join(lines) if lines else "No position data", driver_states


def _find_fastest_driver(
    driver_states: list[dict[str, Any]],
) -> tuple[str, str]:
    """Find the fastest driver this lap."""
    fastest_id = "N/A"
    fastest_time = "N/A"
    best = float("inf")
    for ds in driver_states:
        t = ds.get("lap_time")
        if t is not None and t < best:
            best = t
            fastest_id = ds["driver_id"]
            fastest_time = f"{t:.3f}s"
    return fastest_id, fastest_time


def _find_biggest_gap_change(
    sim_result: SimResult | None, lap_number: int
) -> tuple[str, str, str, str]:
    """Find the driver with the biggest gap change this lap vs previous.

    Returns:
        (driver_id, direction, amount, target_driver)
    """
    if sim_result is None or lap_number < 2:
        return "N/A", "closing", "0.0", "N/A"

    simulated_laps = sim_result.simulated_laps or {}
    biggest_change = 0.0
    result = ("N/A", "closing", "0.0", "N/A")

    for driver_id, laps_data in simulated_laps.items():
        if not isinstance(laps_data, list):
            continue
        current_gap = None
        prev_gap = None
        for lap_data in laps_data:
            if not isinstance(lap_data, dict):
                continue
            if lap_data.get("lap_number") == lap_number:
                current_gap = lap_data.get("gap_to_leader")
            elif lap_data.get("lap_number") == lap_number - 1:
                prev_gap = lap_data.get("gap_to_leader")

        if current_gap is not None and prev_gap is not None:
            delta = abs(current_gap - prev_gap)
            if delta > biggest_change:
                biggest_change = delta
                direction = "closing" if current_gap < prev_gap else "losing"
                result = (driver_id, direction, f"{delta:.1f}", "leader")

    return result


def _find_pit_events(
    sim_result: SimResult | None, lap_number: int
) -> str:
    """Find pit stops that occurred on a given lap."""
    if sim_result is None:
        return "None"

    simulated_laps = sim_result.simulated_laps or {}
    pitting: list[str] = []

    for driver_id, laps_data in simulated_laps.items():
        if not isinstance(laps_data, list):
            continue
        for lap_data in laps_data:
            if not isinstance(lap_data, dict):
                continue
            if lap_data.get("lap_number") == lap_number and lap_data.get("is_pit_lap"):
                compound = lap_data.get("new_compound", "?")
                pitting.append(f"{driver_id} -> {compound}")

    return ", ".join(pitting) if pitting else "None"


def _find_active_event(race: Race, lap_number: int) -> str:
    """Check if any race event is active on the given lap."""
    for event in race.race_events:
        if event.lap_start <= lap_number <= event.lap_end:
            return f"{event.event_type} (laps {event.lap_start}-{event.lap_end})"
    return "None"


def generate_commentary(
    race: Race,
    scenario: Scenario | None,
    sim_result: SimResult | None,
    lap_number: int,
    focus_driver_id: str | None = None,
) -> dict[str, Any]:
    """Generate commentary for a single lap of a simulated race.

    Args:
        race: The Race ORM object.
        scenario: The Scenario ORM object (may be None).
        sim_result: The SimResult ORM object (may be None).
        lap_number: Lap number to generate commentary for.
        focus_driver_id: Optional driver to focus commentary on.

    Returns:
        Dict with lap_number, commentary text, and key_facts list.
    """
    scenario_desc = (
        scenario.description if scenario and scenario.description else "baseline"
    )

    position_tower_str, driver_states = _build_position_tower(sim_result, lap_number)
    fastest_driver, fastest_time = _find_fastest_driver(driver_states)
    gap_driver, gap_dir, gap_amount, gap_target = _find_biggest_gap_change(
        sim_result, lap_number
    )
    pit_events = _find_pit_events(sim_result, lap_number)
    active_event = _find_active_event(race, lap_number)

    # Build key facts
    key_facts: list[str] = []
    if fastest_driver != "N/A":
        key_facts.append(f"Fastest: {fastest_driver} ({fastest_time})")
    if pit_events != "None":
        key_facts.append(f"Pit stops: {pit_events}")
    if active_event != "None":
        key_facts.append(f"Event: {active_event}")
    if focus_driver_id:
        for ds in driver_states:
            if ds["driver_id"] == focus_driver_id:
                key_facts.append(
                    f"Focus {focus_driver_id}: P{ds.get('position', '?')}"
                )
                break

    user_prompt = USER_PROMPT_TEMPLATE.format(
        race_name=race.name,
        scenario_description=scenario_desc,
        lap_number=lap_number,
        total_laps=race.total_laps,
        position_tower=position_tower_str,
        fastest_driver=fastest_driver,
        fastest_time=fastest_time,
        gap_change_driver=gap_driver,
        gap_direction=gap_dir,
        gap_amount=gap_amount,
        target_driver=gap_target,
        pit_events=pit_events,
        active_event_or_none=active_event,
        weather_state="Dry",  # TODO: pull from weather samples
        previous_commentary="(start of commentary)" if lap_number <= 1 else "",
    )

    commentary_text = call_claude(SYSTEM_PROMPT, user_prompt)

    return {
        "lap_number": lap_number,
        "commentary": commentary_text,
        "key_facts": key_facts,
    }
