from __future__ import annotations

from typing import Any

from pydantic import Field

from app.models.common import ApiModel


class ErrorDetail(ApiModel):
    code: str
    message: str
    retryable: bool = False
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorEnvelope(ApiModel):
    error: ErrorDetail
