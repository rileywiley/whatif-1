"""Weather ETL pipeline.

Processes FastF1 weather data into per-lap WeatherSample and SurfaceState
records with computed surface water levels and grip scalars.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import numpy as np
import pandas as pd

from backend.app.models import SurfaceState, WeatherSample

if TYPE_CHECKING:
    from backend.app.models import Circuit

logger = logging.getLogger(__name__)


def _interpolate_weather_to_laps(
    weather_df: pd.DataFrame,
    laps_df: pd.DataFrame,
    total_laps: int,
) -> list[dict]:
    """Map weather samples to per-lap granularity.

    For each lap number, find the weather observation closest in time to
    that lap's timestamp and return a list of per-lap weather dicts.
    """
    if weather_df is None or weather_df.empty:
        logger.warning("No weather data available; generating defaults")
        return [
            {
                "lap_number": lap,
                "air_temp": 25.0,
                "track_temp": 35.0,
                "humidity": 40.0,
                "wind_speed": 2.0,
                "wind_direction": 0.0,
                "rainfall": 0.0,
                "pressure": 1013.0,
            }
            for lap in range(1, total_laps + 1)
        ]

    # Build a mapping from lap number to its approximate session time
    # using the laps DataFrame
    lap_times: dict[int, pd.Timedelta] = {}
    if laps_df is not None and not laps_df.empty and "Time" in laps_df.columns:
        # Group by lap number and take the median time (across drivers)
        for lap_num in range(1, total_laps + 1):
            lap_rows = laps_df[laps_df["LapNumber"] == lap_num]
            valid = lap_rows.dropna(subset=["Time"])
            if not valid.empty:
                lap_times[lap_num] = valid["Time"].median()

    # Ensure weather_df has a Time column
    if "Time" not in weather_df.columns:
        # Fall back to even spacing
        weather_records = weather_df.to_dict("records")
        per_lap = []
        for lap in range(1, total_laps + 1):
            idx = min(
                int((lap - 1) / total_laps * len(weather_records)),
                len(weather_records) - 1,
            )
            wr = weather_records[idx]
            per_lap.append(_weather_row_to_dict(lap, wr))
        return per_lap

    # Sort weather by time
    wx = weather_df.sort_values("Time").reset_index(drop=True)
    wx_times = wx["Time"].values  # numpy array of Timedelta

    per_lap: list[dict] = []
    for lap in range(1, total_laps + 1):
        if lap in lap_times:
            target = lap_times[lap]
            # Find nearest weather sample
            try:
                diffs = np.abs(wx_times - target)
                idx = int(np.argmin(diffs))
            except (TypeError, ValueError):
                idx = min(
                    int((lap - 1) / total_laps * len(wx)),
                    len(wx) - 1,
                )
        else:
            # Fallback: linear interpolation
            idx = min(
                int((lap - 1) / total_laps * len(wx)),
                len(wx) - 1,
            )

        wr = wx.iloc[idx]
        per_lap.append(_weather_row_to_dict(lap, wr))

    return per_lap


def _weather_row_to_dict(lap: int, row) -> dict:
    """Extract weather values from a row (dict or Series), handling NaN."""

    def _val(key: str, default: float) -> float:
        if isinstance(row, dict):
            v = row.get(key)
        else:
            v = row.get(key) if key in row.index else None
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return default
        try:
            return float(v)
        except (TypeError, ValueError):
            return default

    return {
        "lap_number": lap,
        "air_temp": _val("AirTemp", 25.0),
        "track_temp": _val("TrackTemp", 35.0),
        "humidity": _val("Humidity", 40.0),
        "wind_speed": _val("WindSpeed", 2.0),
        "wind_direction": _val("WindDirection", 0.0),
        "rainfall": _val("Rainfall", 0.0),
        "pressure": _val("Pressure", 1013.0),
    }


def _compute_surface_state(
    lap_number: int,
    weather: dict,
    prev_water: float,
    drying_rate_coeff: float,
    lap_duration: float,
) -> dict:
    """Compute surface state for a single lap.

    Implements the surface water accumulation / evaporation model from
    DATA_MODEL.md.
    """
    rainfall = weather["rainfall"]
    track_temp = weather["track_temp"]
    wind_speed = weather["wind_speed"]
    humidity = weather["humidity"]

    # Rain accumulation
    rain_addition = rainfall * (lap_duration / 3600.0)

    # Evaporation
    temp_factor = max(0.3, track_temp / 45.0)
    wind_factor = 1.0 + (wind_speed / 20.0)
    evaporation = drying_rate_coeff * temp_factor * wind_factor * (lap_duration / 90.0)

    surface_water = max(0.0, prev_water + rain_addition - evaporation)

    # Valid compound class
    if surface_water < 0.3:
        valid_class = "DRY"
    elif surface_water < 4.0:
        valid_class = "INTERMEDIATE"
    else:
        valid_class = "WET"

    # Grip scalar
    humidity_penalty = max(0.0, (humidity - 50.0) / 500.0)
    grip_scalar = 1.0 - humidity_penalty

    # Tyre deg temperature modifier
    tyre_deg_modifier = 1.0 + (track_temp - 45.0) / 100.0
    tyre_deg_modifier = max(0.7, min(1.5, tyre_deg_modifier))

    return {
        "surface_water_mm": surface_water,
        "grip_scalar": grip_scalar,
        "valid_compound_class": valid_class,
        "tyre_deg_temp_modifier": tyre_deg_modifier,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def process_weather(
    session,
    race_id: str,
    circuit: Circuit,
    total_laps: int,
) -> tuple[list[WeatherSample], list[SurfaceState]]:
    """Process weather data from a FastF1 session.

    Parameters
    ----------
    session:
        A loaded FastF1 Session object (with weather=True).
    race_id:
        The race identifier string.
    circuit:
        The Circuit ORM object (used for drying_rate_coeff).
    total_laps:
        Number of laps in the race.

    Returns
    -------
    tuple[list[WeatherSample], list[SurfaceState]]
        Lists of ORM objects ready to be added to the database.
    """
    try:
        weather_df = session.weather_data
    except AttributeError:
        weather_df = None

    laps_df = session.laps

    per_lap_wx = _interpolate_weather_to_laps(weather_df, laps_df, total_laps)

    weather_samples: list[WeatherSample] = []
    surface_states: list[SurfaceState] = []

    drying_rate = circuit.drying_rate_coeff if circuit.drying_rate_coeff else 0.5
    prev_water = 0.0
    default_lap_duration = 90.0  # seconds, reasonable default

    for wx in per_lap_wx:
        lap_num = wx["lap_number"]

        # Create WeatherSample
        is_raining = wx["rainfall"] > 0.0
        sample = WeatherSample(
            sample_id=f"{race_id}-wx-{lap_num}",
            race_id=race_id,
            lap_number=lap_num,
            air_temp_celsius=wx["air_temp"],
            track_temp_celsius=wx["track_temp"],
            humidity_percent=wx["humidity"],
            wind_speed_ms=wx["wind_speed"],
            wind_direction_deg=wx["wind_direction"],
            rainfall_intensity_mm_hr=wx["rainfall"],
            is_raining=is_raining,
            pressure_mbar=wx["pressure"],
        )
        weather_samples.append(sample)

        # Compute SurfaceState
        surf = _compute_surface_state(
            lap_num,
            wx,
            prev_water,
            drying_rate,
            default_lap_duration,
        )
        prev_water = surf["surface_water_mm"]

        state = SurfaceState(
            state_id=f"{race_id}-surf-{lap_num}",
            race_id=race_id,
            lap_number=lap_num,
            surface_water_mm=surf["surface_water_mm"],
            grip_scalar=surf["grip_scalar"],
            valid_compound_class=surf["valid_compound_class"],
            tyre_deg_temp_modifier=surf["tyre_deg_temp_modifier"],
        )
        surface_states.append(state)

    logger.info(
        "Processed %d weather samples and %d surface states for %s",
        len(weather_samples),
        len(surface_states),
        race_id,
    )
    return weather_samples, surface_states
