"""Pydantic schemas for lap-data endpoints."""

from pydantic import BaseModel, Field


class LapSchema(BaseModel):
    """A single lap record for one driver."""

    lap_number: int
    lap_time_seconds: float | None = None
    sector1_seconds: float | None = None
    sector2_seconds: float | None = None
    sector3_seconds: float | None = None
    tyre_compound: str
    tyre_age: int
    position: int | None = None
    gap_to_leader_seconds: float | None = None
    interval_seconds: float | None = None
    is_under_sc: bool = False
    is_under_vsc: bool = False


class LapsResponse(BaseModel):
    """Response body for GET /races/{race_id}/laps.

    Keys are driver IDs (e.g. "VER"), values are lists of LapSchema.
    """

    laps: dict[str, list[LapSchema]] = Field(default_factory=dict)
