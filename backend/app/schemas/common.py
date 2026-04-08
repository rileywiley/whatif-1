"""Common Pydantic schemas used across multiple endpoints."""

from pydantic import BaseModel, Field
from typing import Any


class ErrorDetail(BaseModel):
    """Inner error object returned in all error responses."""

    code: str = Field(..., description="Machine-readable error code, e.g. RACE_NOT_FOUND")
    message: str = Field(..., description="Human-readable error message")
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    """Standard error envelope returned by all endpoints on failure."""

    model_config = {"json_schema_extra": {"examples": [{"error": {"code": "RACE_NOT_FOUND", "message": "Race 2025-xxx not found", "details": {}}}]}}

    error: ErrorDetail


class TaskStatusResponse(BaseModel):
    """Response returned when a simulation is processed asynchronously (202)
    or when polling GET /tasks/{task_id}."""

    model_config = {"populate_by_name": True}

    task_id: str
    status: str = Field(..., description="processing | completed | failed")
    poll_url: str | None = None
    result: dict[str, Any] | None = None
