from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.models import Race, RaceEvent, Scenario

from backend.app.simulation.position import DriverState


def get_active_event(events: list, lap_num: int) -> object | None:
    """Return the active event at this lap, if any."""
    for event in events:
        if event.lap_start <= lap_num <= event.lap_end:
            return event
    return None


def event_overlay(
    driver: DriverState,
    active_event: object | None,
    lap_num: int,
) -> tuple[float, bool]:
    """Returns (lap_time_delta, is_neutralized)."""
    if active_event is None:
        return 0.0, False

    event_type = getattr(active_event, "event_type", None)

    if event_type == "SAFETY_CAR":
        sc_pace = driver.base_pace * 1.35
        normal_lap = driver.base_pace
        return sc_pace - normal_lap, True

    elif event_type == "VSC":
        vsc_pace = driver.base_pace * 1.30
        normal_lap = driver.base_pace
        return vsc_pace - normal_lap, True

    elif event_type == "RED_FLAG":
        return 0.0, True

    elif event_type == "PENALTY":
        if getattr(active_event, "trigger_driver_id", None) == driver.driver_id:
            return getattr(active_event, "penalty_seconds", 0.0) or 0.0, False

    return 0.0, False


def build_event_timeline(race: Race, scenario: Scenario) -> list:
    """Build modified event timeline from race events + scenario overrides."""
    events = list(race.race_events)

    overrides = scenario.event_overrides
    if not overrides:
        return events

    # Process overrides
    result = []
    removed_ids = set()
    modified = {}

    for override in overrides:
        action = override.get("action", "")
        event_id = override.get("event_id")

        if action == "REMOVE" and event_id:
            removed_ids.add(event_id)
        elif action == "SHORTEN" and event_id:
            modified[event_id] = override

    for event in events:
        if event.event_id in removed_ids:
            continue
        if event.event_id in modified:
            mod = modified[event.event_id]
            if "new_lap_end" in mod:
                event.lap_end = mod["new_lap_end"]
        result.append(event)

    # Add new events
    from backend.app.models import RaceEvent as RaceEventModel

    for override in overrides:
        if override.get("action") == "ADD":
            new_event = RaceEventModel(
                event_id=f"{race.race_id}-{override['event_type'].lower()}-added",
                race_id=race.race_id,
                event_type=override["event_type"],
                lap_start=override["lap_start"],
                lap_end=override["lap_end"],
                trigger_driver_id=override.get("trigger_driver_id"),
            )
            result.append(new_event)

    return sorted(result, key=lambda e: e.lap_start)
