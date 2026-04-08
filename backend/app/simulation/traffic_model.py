from __future__ import annotations

from backend.app.simulation.position import DriverState, RaceParams, get_car_ahead


def traffic_penalty(
    driver: DriverState,
    all_drivers: list[DriverState],
    race_params: RaceParams,
    surface_state: object,
) -> float:
    """Time lost from dirty air behind another car. Positive = slower."""
    car_ahead = get_car_ahead(driver, all_drivers)
    if car_ahead is None:
        return 0.0

    gap = driver.interval
    grip_scalar = getattr(surface_state, "grip_scalar", 1.0)

    dirty_air_penalty = 0.0
    drs_benefit = 0.0

    if gap < 1.5:
        base_penalty = 0.8 * (1.0 - gap / 1.5)
        track_factor = 0.5 + 0.5 * race_params.overtake_difficulty
        dirty_air_penalty = base_penalty * track_factor * (2.0 - grip_scalar)

    if gap <= 1.0:
        drs_benefit = -race_params.drs_effect_seconds

        if driver.ers_mode == "ATTACK":
            drs_benefit -= 0.15
        elif driver.ers_mode == "OVERTAKE":
            drs_benefit -= 0.25
        elif driver.ers_mode == "DEFEND":
            dirty_air_penalty -= 0.1

    return round(dirty_air_penalty + drs_benefit, 4)
