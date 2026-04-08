from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from backend.app.models import Race, Scenario

from backend.app.simulation.position import DriverState


def compute_diff(
    race: Race,
    sim_finish: list[DriverState],
    sim_laps: dict,
) -> dict:
    """Compare simulated results against actual race results."""
    diff = {}

    for entry in race.driver_entries:
        driver_id = entry.driver_id
        actual_pos = entry.finish_position
        sim_driver = next(
            (d for d in sim_finish if d.driver_id == driver_id), None
        )
        sim_pos = sim_driver.position if sim_driver else None

        delta = (actual_pos - sim_pos) if (actual_pos and sim_pos) else None

        diff[driver_id] = {
            "driver_name": entry.driver_name,
            "team_id": entry.team_id,
            "actual_position": actual_pos,
            "simulated_position": sim_pos,
            "position_delta": delta,
        }

    return diff


def find_key_divergence_lap(
    race: Race,
    sim_laps: dict,
) -> int | None:
    """Find the lap where simulation diverges most from actual."""
    max_divergence = 0
    key_lap = None

    total_laps = race.total_laps
    entries_by_driver = {e.driver_id: e for e in race.driver_entries}

    for lap_num in range(1, total_laps + 1):
        divergence = 0
        for driver_id, entry in entries_by_driver.items():
            if driver_id not in sim_laps:
                continue
            sim_lap_data = sim_laps[driver_id]
            if lap_num - 1 >= len(sim_lap_data):
                continue

            sim_pos = sim_lap_data[lap_num - 1].get("position")
            actual_lap = next(
                (l for l in entry.laps if l.lap_number == lap_num), None
            )
            actual_pos = actual_lap.position if actual_lap else None

            if sim_pos and actual_pos:
                divergence += abs(sim_pos - actual_pos)

        if divergence > max_divergence:
            max_divergence = divergence
            key_lap = lap_num

    return key_lap


def compute_confidence(scenario: Scenario) -> float:
    """Estimate confidence based on scenario complexity."""
    score = 1.0

    if scenario.pit_overrides:
        num_changes = sum(
            len(v.get("stops", [])) for v in scenario.pit_overrides.values()
        )
        score -= 0.02 * num_changes

    if scenario.event_overrides:
        for override in scenario.event_overrides:
            if override.get("action") == "REMOVE":
                score -= 0.08
            elif override.get("action") == "ADD":
                score -= 0.12

    if scenario.weather_overrides:
        for w in scenario.weather_overrides:
            if "rainfall_intensity_mm_hr" in w and w["rainfall_intensity_mm_hr"] > 0:
                score -= 0.15
            elif "track_temp_offset_celsius" in w:
                score -= 0.03 * abs(w["track_temp_offset_celsius"]) / 5

    if scenario.driver_overrides:
        for d in scenario.driver_overrides.values():
            if "pace_offset_seconds" in d:
                score -= 0.05 * abs(d["pace_offset_seconds"])

    return max(0.1, min(1.0, score))
