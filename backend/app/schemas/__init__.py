"""Pydantic v2 schemas for the WhatIf-1 API."""

from backend.app.schemas.common import (
    ErrorDetail,
    ErrorResponse,
    TaskStatusResponse,
)
from backend.app.schemas.event import (
    RaceEventSchema,
    WeatherSummarySchema,
)
from backend.app.schemas.lap import (
    LapSchema,
    LapsResponse,
)
from backend.app.schemas.race import (
    CircuitSchema,
    DriverEntrySchema,
    PitStopSchema,
    RaceDetail,
    RaceDetailResponse,
    RaceListItem,
    RacesResponse,
    StintSchema,
    SuggestedScenario,
)
from backend.app.schemas.scenario import (
    CommentaryRequest,
    CommentaryResponse,
    DiffEntry,
    DriverOverrideItem,
    EventOverrideItem,
    KeyFact,
    PitOverrideDriver,
    PitOverrideStop,
    QueryParsed,
    RaceParamOverrides,
    ScenarioDetail,
    ScenarioInput,
    SimResult,
    SimResultResponse,
    SimulatedLap,
    SolverAnswer,
    SolverQueryInput,
    SolverResultResponse,
    StintBreakdown,
    SuggestedAlternative,
    WeatherOverrideItem,
)

__all__ = [
    # common
    "ErrorDetail",
    "ErrorResponse",
    "TaskStatusResponse",
    # event
    "RaceEventSchema",
    "WeatherSummarySchema",
    # lap
    "LapSchema",
    "LapsResponse",
    # race
    "CircuitSchema",
    "DriverEntrySchema",
    "PitStopSchema",
    "RaceDetail",
    "RaceDetailResponse",
    "RaceListItem",
    "RacesResponse",
    "StintSchema",
    "SuggestedScenario",
    # scenario
    "CommentaryRequest",
    "CommentaryResponse",
    "DiffEntry",
    "DriverOverrideItem",
    "EventOverrideItem",
    "KeyFact",
    "PitOverrideDriver",
    "PitOverrideStop",
    "QueryParsed",
    "RaceParamOverrides",
    "ScenarioDetail",
    "ScenarioInput",
    "SimResult",
    "SimResultResponse",
    "SimulatedLap",
    "SolverAnswer",
    "SolverQueryInput",
    "SolverResultResponse",
    "StintBreakdown",
    "SuggestedAlternative",
    "WeatherOverrideItem",
]
