from __future__ import annotations

from typing import Any

from fastapi.responses import JSONResponse


class DomainError(Exception):
    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        retryable: bool = False,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.retryable = retryable
        self.details = details or {}


def error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    retryable: bool = False,
    details: dict[str, Any] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "retryable": retryable,
                "details": details or {},
            }
        },
    )


def domain_error_response(error: DomainError) -> JSONResponse:
    return error_response(
        status_code=error.status_code,
        code=error.code,
        message=error.message,
        retryable=error.retryable,
        details=error.details,
    )
