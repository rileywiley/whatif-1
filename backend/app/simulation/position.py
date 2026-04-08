from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DriverState:
    driver_id: str
    team_id: str
    base_pace: float
    cumulative_time: float = 0.0
    position: int = 0
    tyre_compound: str = "MEDIUM"
    tyre_age: int = 1
    fuel_load_kg: float = 110.0
    fuel_burn_per_lap: float = 1.9
    gap_to_leader: float = 0.0
    interval: float = 0.0
    retired: bool = False
    pit_schedule: list = field(default_factory=list)
    pace_offset: float = 0.0
    tyre_management_pct: float = 50.0
    ers_mode: str = "BALANCED"
    engine_mode: str = "STANDARD"
    out_lap_penalty: float = 0.0


@dataclass
class RaceParams:
    pit_loss_seconds: float = 22.0
    overtake_difficulty: float = 0.5
    drs_effect_seconds: float = 0.3


def get_car_ahead(
    driver: DriverState, all_drivers: list[DriverState]
) -> DriverState | None:
    active = [d for d in all_drivers if not d.retired and d.position < driver.position]
    if not active:
        return None
    return min(active, key=lambda d: driver.position - d.position)


MIN_GAP = 0.2


def resolve_positions(
    drivers: list[DriverState],
    lap_num: int,
    race_params: RaceParams,
    active_event: object | None,
) -> None:
    active = [d for d in drivers if not d.retired]
    active.sort(key=lambda d: d.cumulative_time)

    # Under SC: compress gaps
    if active_event and getattr(active_event, "event_type", None) == "SAFETY_CAR":
        leader_time = active[0].cumulative_time
        for i, driver in enumerate(active):
            driver.cumulative_time = leader_time + (i * MIN_GAP)

    # Compute positions and gaps
    leader_time = active[0].cumulative_time
    for i, driver in enumerate(active):
        driver.position = i + 1
        driver.gap_to_leader = driver.cumulative_time - leader_time
        if i > 0:
            driver.interval = driver.cumulative_time - active[i - 1].cumulative_time
        else:
            driver.interval = 0.0

    # No overtaking under SC/VSC
    if active_event and getattr(active_event, "event_type", None) in (
        "SAFETY_CAR",
        "VSC",
    ):
        return

    # Deterministic overtake resolution
    for i in range(len(active) - 1):
        ahead = active[i]
        behind = active[i + 1]

        gap = behind.cumulative_time - ahead.cumulative_time
        if gap > 1.5:
            continue

        if gap < MIN_GAP:
            overtake_threshold = 0.3 + 0.7 * race_params.overtake_difficulty

            if gap < 0:
                delta = abs(gap)
                if delta > overtake_threshold:
                    behind.cumulative_time = ahead.cumulative_time + MIN_GAP
                    active[i], active[i + 1] = active[i + 1], active[i]
                else:
                    behind.cumulative_time = ahead.cumulative_time + MIN_GAP

    # Reassign positions after overtake resolution
    for i, driver in enumerate(active):
        driver.position = i + 1
        driver.gap_to_leader = driver.cumulative_time - active[0].cumulative_time
        if i > 0:
            driver.interval = driver.cumulative_time - active[i - 1].cumulative_time
        else:
            driver.interval = 0.0


def handle_pit_stops(
    drivers: list[DriverState],
    lap_num: int,
    race_params: RaceParams,
    active_event: object | None,
) -> None:
    for driver in drivers:
        if driver.retired:
            continue

        scheduled = next(
            (s for s in driver.pit_schedule if s["lap"] == lap_num), None
        )
        if scheduled is None:
            continue

        pit_loss = race_params.pit_loss_seconds

        if active_event and getattr(active_event, "event_type", None) == "SAFETY_CAR":
            pit_loss = pit_loss * 0.5
        elif active_event and getattr(active_event, "event_type", None) == "VSC":
            pit_loss = pit_loss * 0.65

        driver.cumulative_time += pit_loss
        driver.tyre_compound = scheduled["compound_to"]
        driver.tyre_age = 0
        driver.out_lap_penalty = 1.5
