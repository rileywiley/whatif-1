"""Pydantic schemas for race events and weather."""

from pydantic import BaseModel, Field


class RaceEventSchema(BaseModel):
    """A race event (SC, VSC, red flag, penalty, etc.)."""

    event_id: str
    event_type: str
    lap_start: int
    lap_end: int
    trigger_driver_id: str | None = None
    details: str | None = None


class WeatherSummarySchema(BaseModel):
    """Aggregated weather summary for a race."""

    avg_air_temp_celsius: float
    avg_track_temp_celsius: float
    rain_laps: list[int] = Field(default_factory=list)
    max_rainfall_mm_hr: float = 0.0
