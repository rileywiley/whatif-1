from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from backend.app.models import Race

from backend.app.simulation.position import DriverState


@dataclass
class TyreDegModel:
    compound: str
    d1: float  # phase 1 deg rate: s/lap
    d2: float  # phase 2 deg rate: s/lap
    cliff_onset_lap: int
    graining_laps: int
    graining_penalty: float
    compound_delta: float  # vs MEDIUM baseline


COMPOUND_DELTAS = {
    "SOFT": -0.8,
    "MEDIUM": 0.0,
    "HARD": 0.6,
    "INTERMEDIATE": 0.0,
    "WET": 0.0,
}


def fit_tyre_models(race: Race) -> dict[str, TyreDegModel]:
    """Fit degradation models from actual race data."""
    compounds_used: set[str] = set()
    for entry in race.driver_entries:
        for lap in entry.laps:
            if lap.tyre_compound:
                compounds_used.add(lap.tyre_compound)

    models = {}
    fuel_per_lap = 110.0 / race.total_laps

    for compound in compounds_used:
        # Collect clean lap data for this compound across all drivers
        ages = []
        times = []
        for entry in race.driver_entries:
            for lap in entry.laps:
                if (
                    lap.tyre_compound != compound
                    or lap.lap_time_seconds is None
                    or lap.is_pit_in_lap
                    or lap.is_pit_out_lap
                    or lap.is_under_sc
                    or lap.is_under_vsc
                ):
                    continue
                fuel_correction = lap.lap_number * fuel_per_lap * 0.035
                corrected_time = lap.lap_time_seconds + fuel_correction
                ages.append(lap.tyre_age)
                times.append(corrected_time)

        if len(ages) < 10:
            # Not enough data, use defaults
            models[compound] = TyreDegModel(
                compound=compound,
                d1=0.04,
                d2=0.25,
                cliff_onset_lap=25,
                graining_laps=0,
                graining_penalty=0.0,
                compound_delta=COMPOUND_DELTAS.get(compound, 0.0),
            )
            continue

        ages_arr = np.array(ages, dtype=float)
        times_arr = np.array(times, dtype=float)

        # Remove outliers
        median_time = np.median(times_arr)
        mask = times_arr < median_time * 1.07
        ages_arr = ages_arr[mask]
        times_arr = times_arr[mask]

        if len(ages_arr) < 6:
            models[compound] = TyreDegModel(
                compound=compound,
                d1=0.04,
                d2=0.25,
                cliff_onset_lap=25,
                graining_laps=0,
                graining_penalty=0.0,
                compound_delta=COMPOUND_DELTAS.get(compound, 0.0),
            )
            continue

        # Fit two-phase piecewise linear
        best_residual = float("inf")
        best_params: tuple[float, float, int, float] | None = None
        max_age = int(ages_arr.max())

        for cliff in range(8, min(40, max_age)):
            phase1_mask = ages_arr < cliff
            phase2_mask = ages_arr >= cliff

            if phase1_mask.sum() < 3 or phase2_mask.sum() < 3:
                continue

            p1_fit = np.polyfit(ages_arr[phase1_mask], times_arr[phase1_mask], 1)
            d1 = max(0.0, p1_fit[0])

            p2_fit = np.polyfit(ages_arr[phase2_mask], times_arr[phase2_mask], 1)
            d2 = max(d1, p2_fit[0])

            pred = np.where(
                ages_arr < cliff,
                p1_fit[0] * ages_arr + p1_fit[1],
                p2_fit[0] * ages_arr + p2_fit[1],
            )
            residual = float(np.sum((times_arr - pred) ** 2))

            if residual < best_residual:
                best_residual = residual
                best_params = (d1, d2, cliff, p1_fit[1])

        if best_params is None:
            # Fallback: single-phase linear fit
            fit = np.polyfit(ages_arr, times_arr, 1)
            best_params = (max(0.0, fit[0]), max(0.0, fit[0]) * 3, 30, fit[1])

        d1, d2, cliff, _intercept = best_params

        # Detect graining
        early_times = times_arr[ages_arr <= 3]
        mid_times = times_arr[(ages_arr > 5) & (ages_arr <= 10)]
        if len(early_times) > 0 and len(mid_times) > 0:
            graining_penalty = max(0.0, float(np.median(early_times) - np.median(mid_times)))
            graining_laps = 3 if graining_penalty > 0.15 else 0
        else:
            graining_penalty = 0.0
            graining_laps = 0

        models[compound] = TyreDegModel(
            compound=compound,
            d1=round(d1, 4),
            d2=round(d2, 4),
            cliff_onset_lap=cliff,
            graining_laps=graining_laps,
            graining_penalty=round(graining_penalty, 3),
            compound_delta=COMPOUND_DELTAS.get(compound, 0.0),
        )

    return models


def tyre_degradation(
    driver: DriverState,
    tyre_models: dict[str, TyreDegModel],
    surface_state: object,
) -> float:
    """Returns lap time delta from tyre wear. Positive = slower."""
    model = tyre_models.get(driver.tyre_compound)
    if model is None:
        return 0.0

    age = driver.tyre_age

    # Tyre management modifier
    mgmt = driver.tyre_management_pct / 100.0
    deg_modifier = 1.3 - (0.6 * mgmt)
    mgmt_pace = -0.1 + (0.25 * mgmt)

    # Temperature modifier from surface state
    temp_modifier = getattr(surface_state, "tyre_deg_temp_modifier", 1.0)

    effective_d1 = model.d1 * deg_modifier * temp_modifier
    effective_d2 = model.d2 * deg_modifier * temp_modifier

    if age <= model.graining_laps and model.graining_laps > 0:
        deg = model.graining_penalty * (1.0 - age / max(1, model.graining_laps))
    elif age < model.cliff_onset_lap:
        deg = effective_d1 * max(0, age - model.graining_laps)
    else:
        phase1_total = effective_d1 * (model.cliff_onset_lap - model.graining_laps)
        phase2_extra = effective_d2 * (age - model.cliff_onset_lap)
        deg = phase1_total + phase2_extra

    return round(deg + model.compound_delta + mgmt_pace, 4)
