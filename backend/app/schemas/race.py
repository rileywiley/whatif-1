"""Pydantic schemas for race-related endpoints."""

from datetime import date, datetime
from pydantic import BaseModel, Field

from backend.app.schemas.event import RaceEventSchema, WeatherSummarySchema


# --- Nested helpers ---


class SuggestedScenario(BaseModel):
    """A teaser scenario shown on the race list card."""

    description: str
    estimated_swing: int


class CircuitSchema(BaseModel):
    """Circuit details embedded in RaceDetail."""

    circuit_id: str
    name: str
    track_length_km: float
    pit_loss_seconds: float
    overtake_difficulty: float
    drs_zones: int


class PitStopSchema(BaseModel):
    """A single pit stop within a driver entry."""

    stop_number: int
    lap_number: int
    stop_duration_seconds: float
    tyre_from: str
    tyre_to: str
    was_under_sc: bool = False


class StintSchema(BaseModel):
    """A tyre stint within a driver entry."""

    compound: str
    start_lap: int
    end_lap: int
    laps: int


class DriverEntrySchema(BaseModel):
    """Full driver entry returned inside GET /races/{race_id}."""

    entry_id: str
    driver_id: str
    driver_name: str
    team_id: str
    team_name: str
    team_color: str
    driver_number: int
    grid_position: int
    finish_position: int | None = None
    status: str
    points_scored: float = 0.0
    pit_stops: list[PitStopSchema] = Field(default_factory=list)
    stints: list[StintSchema] = Field(default_factory=list)


# --- Top-level responses ---


class RaceListItem(BaseModel):
    """A single race in the GET /races list."""

    race_id: str
    name: str
    circuit_name: str
    country: str
    year: int
    round_number: int
    date: date
    total_laps: int
    winner_driver_id: str | None = None
    winner_name: str | None = None
    winner_team_color: str | None = None
    disruption_tags: list[str] = Field(default_factory=list)
    suggested_scenario: SuggestedScenario | None = None


class RacesResponse(BaseModel):
    """Response body for GET /races."""

    races: list[RaceListItem] = Field(default_factory=list)
    available_years: list[int] = Field(default_factory=list)


class RaceDetail(BaseModel):
    """The 'race' object inside GET /races/{race_id}."""

    race_id: str
    name: str
    circuit: CircuitSchema
    year: int
    round_number: int
    date: date
    total_laps: int


class RaceDetailResponse(BaseModel):
    """Full response body for GET /races/{race_id}."""

    race: RaceDetail
    drivers: list[DriverEntrySchema] = Field(default_factory=list)
    events: list[RaceEventSchema] = Field(default_factory=list)
    weather_summary: WeatherSummarySchema | None = None
