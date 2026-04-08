from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from backend.app.models import DriverEntry, Race

from backend.app.simulation.position import DriverState


def extract_base_pace(entry: DriverEntry, race: Race) -> float:
    """Extract clean-air base pace from actual race data."""
    clean_laps = [
        lap
        for lap in entry.laps
        if lap.lap_time_seconds is not None
        and not lap.is_pit_in_lap
        and not lap.is_pit_out_lap
        and not lap.is_under_sc
        and not lap.is_under_vsc
        and (lap.interval_seconds is None or lap.interval_seconds > 3.0)
    ]

    if len(clean_laps) < 5:
        all_laps = [
            lap
            for lap in entry.laps
            if lap.lap_time_seconds and not lap.is_under_sc
        ]
        if not all_laps:
            return 90.0  # fallback
        return float(np.median([lap.lap_time_seconds for lap in all_laps]))

    # Remove outliers (>107% of median)
    times = [lap.lap_time_seconds for lap in clean_laps]
    median = float(np.median(times))
    clean_laps = [
        lap for lap, t in zip(clean_laps, times) if t < median * 1.07
    ]

    if not clean_laps:
        return median

    # Regress out fuel effect
    fuel_correction_per_kg = 0.035
    total_fuel_kg = 110.0
    fuel_per_lap = total_fuel_kg / race.total_laps

    corrected_times = []
    for lap in clean_laps:
        fuel_burned = lap.lap_number * fuel_per_lap
        fuel_benefit = fuel_burned * fuel_correction_per_kg
        corrected = lap.lap_time_seconds + fuel_benefit
        corrected_times.append(corrected)

    return round(float(np.percentile(corrected_times, 10)), 3)


def fuel_correction(driver: DriverState, fuel_factor: float = 0.035) -> float:
    """Lap time delta from fuel load. Lighter = faster (negative)."""
    initial_fuel = 110.0
    fuel_benefit = (initial_fuel - driver.fuel_load_kg) * fuel_factor
    return -fuel_benefit
