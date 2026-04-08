"""Pydantic schemas for simulation, solver, and scenario endpoints."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Scenario input sub-models
# ---------------------------------------------------------------------------


class PitOverrideStop(BaseModel):
    """A single pit stop override."""

    lap: int
    compound_to: str


class PitOverrideDriver(BaseModel):
    """Pit stop overrides for one driver."""

    stops: list[PitOverrideStop] = Field(default_factory=list)


class EventOverrideItem(BaseModel):
    """Add, remove, or modify a race event."""

    event_id: str | None = None
    action: str = Field(..., description="REMOVE | SHORTEN | ADD")
    # Fields used when action is SHORTEN
    new_lap_end: int | None = None
    # Fields used when action is ADD
    event_type: str | None = None
    lap_start: int | None = None
    lap_end: int | None = None
    trigger_driver_id: str | None = None


class WeatherOverrideItem(BaseModel):
    """Override weather for a range of laps."""

    lap_range: list[int] = Field(default_factory=list, description="Two-element list [start_lap, end_lap]")
    rainfall_intensity_mm_hr: float | None = None
    track_temp_offset_celsius: float | None = None
    description: str | None = None


class DriverOverrideItem(BaseModel):
    """Performance overrides for a single driver."""

    pace_offset_seconds: float | None = None
    tyre_management_pct: int | None = None
    ers_mode: str | None = None
    engine_mode: str | None = None


class RaceParamOverrides(BaseModel):
    """Global race parameter overrides."""

    pit_loss_seconds: float | None = None
    overtake_difficulty: float | None = None
    drs_effect_seconds: float | None = None


class ScenarioInput(BaseModel):
    """Request body for POST /races/{race_id}/simulate."""

    pit_overrides: dict[str, PitOverrideDriver] = Field(default_factory=dict)
    event_overrides: list[EventOverrideItem] = Field(default_factory=list)
    weather_overrides: list[WeatherOverrideItem] = Field(default_factory=list)
    driver_overrides: dict[str, DriverOverrideItem] = Field(default_factory=dict)
    race_param_overrides: RaceParamOverrides | None = None
    description: str | None = None


# ---------------------------------------------------------------------------
# Simulated lap (inside result)
# ---------------------------------------------------------------------------


class SimulatedLap(BaseModel):
    """A single simulated lap for a driver."""

    lap_number: int
    lap_time: float
    position: int
    gap_to_leader: float
    interval: float
    tyre_compound: str
    tyre_age: int
    fuel_load_kg: float


# ---------------------------------------------------------------------------
# Diff
# ---------------------------------------------------------------------------


class DiffEntry(BaseModel):
    """Position diff for one driver between actual and simulated results."""

    actual_position: int
    simulated_position: int
    position_delta: int


# ---------------------------------------------------------------------------
# Simulation result
# ---------------------------------------------------------------------------


class SimResult(BaseModel):
    """The 'result' object inside the simulate response."""

    finish_order: list[str] = Field(default_factory=list)
    position_history: dict[str, list[int]] = Field(default_factory=dict)
    simulated_laps: dict[str, list[SimulatedLap]] = Field(default_factory=dict)
    diff_summary: dict[str, DiffEntry] = Field(default_factory=dict)
    key_divergence_lap: int | None = None
    confidence_score: float = 0.0
    narrative: str | None = None


class SimResultResponse(BaseModel):
    """Response body for POST /races/{race_id}/simulate (synchronous 200)."""

    scenario_id: str
    result: SimResult
    computation_time_ms: int


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------


class SolverQueryInput(BaseModel):
    """Request body for POST /races/{race_id}/solve."""

    query: str
    context: dict[str, Any] = Field(default_factory=dict)


class QueryParsed(BaseModel):
    """Parsed representation of the solver query."""

    type: str
    driver: str | None = None
    target_driver: str | None = None
    parameter: str | None = None
    search_range: list[float] = Field(default_factory=list)


class StintBreakdown(BaseModel):
    """Per-stint detail in a solver answer."""

    stint: str
    target_pace: str
    actual_pace: str
    delta: str


class SolverAnswer(BaseModel):
    """The core answer block in a solver response."""

    threshold_value: float
    parameter: str
    unit: str
    is_feasible: bool
    feasibility_note: str | None = None
    per_stint_breakdown: list[StintBreakdown] = Field(default_factory=list)


class SuggestedAlternative(BaseModel):
    """An alternative scenario the solver may suggest."""

    description: str
    scenario_params: dict[str, Any] = Field(default_factory=dict)


class SolverResultResponse(BaseModel):
    """Response body for POST /races/{race_id}/solve."""

    query_parsed: QueryParsed
    answer: SolverAnswer
    sim_result: SimResult | None = None
    narrative: str | None = None
    suggested_alternative: SuggestedAlternative | None = None


# ---------------------------------------------------------------------------
# Commentary
# ---------------------------------------------------------------------------


class CommentaryRequest(BaseModel):
    """Request body for POST /races/{race_id}/commentary."""

    scenario_id: str
    lap_number: int
    focus_driver_id: str | None = None


class KeyFact(BaseModel):
    """A structured fact surfaced in lap commentary."""

    type: str
    driver: str | None = None
    target: str | None = None
    lap_time: str | None = None
    rate: str | None = None
    compound: str | None = None
    age: int | None = None


class CommentaryResponse(BaseModel):
    """Response body for POST /races/{race_id}/commentary."""

    lap_number: int
    commentary: str
    key_facts: list[KeyFact] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Saved scenario detail
# ---------------------------------------------------------------------------


class ScenarioDetail(BaseModel):
    """Response body for GET /scenarios/{scenario_id}."""

    scenario_id: str
    race_id: str
    race_name: str
    description: str | None = None
    created_at: datetime
    modifications_summary: list[str] = Field(default_factory=list)
    result: SimResult | None = None
