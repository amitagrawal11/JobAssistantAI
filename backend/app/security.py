from __future__ import annotations

import hmac

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.config import get_settings
from app.errors import error_response


class DevelopmentBearerTokenMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.url.path == "/health":
            return await call_next(request)

        supplied = request.headers.get("authorization", "")
        expected = f"Bearer {get_settings().development_bearer_token}"
        if not hmac.compare_digest(supplied, expected):
            return error_response(
                status_code=401,
                code="AUTHENTICATION_REQUIRED",
                message="A valid development bearer token is required.",
            )
        return await call_next(request)
