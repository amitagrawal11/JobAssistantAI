"""Executable contract check for the Phase 2 backend boundary."""

from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


EXPECTED_HEALTH = {
    "status": "ok",
    "database": "ok",
    "storage": "ok",
    "version": "0.1.0",
}


def assert_environment() -> None:
    required = {
        "APP_ENV",
        "DATABASE_URL",
        "STORAGE_ROOT",
        "DEVELOPMENT_BEARER_TOKEN",
        "AI_PROVIDER",
        "OLLAMA_BASE_URL",
    }
    missing = sorted(name for name in required if not os.environ.get(name))
    assert not missing, f"Missing required settings: {', '.join(missing)}"
    assert Path(os.environ["STORAGE_ROOT"]).is_dir(), "Storage root is unavailable"


def read_json(path: str, token: str | None = None) -> tuple[int, dict[str, object]]:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    request = Request(f"http://127.0.0.1:8000{path}", headers=headers)
    try:
        with urlopen(request, timeout=5) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.load(error)


def assert_http_contracts() -> None:
    status, payload = read_json("/health")
    assert status == 200
    assert payload == EXPECTED_HEALTH

    status, payload = read_json("/api/config-check")
    assert status == 401
    assert payload == {
        "error": {
            "code": "AUTHENTICATION_REQUIRED",
            "message": "A valid development bearer token is required.",
            "retryable": False,
            "details": {},
        }
    }

    status, payload = read_json(
        "/api/config-check", os.environ["DEVELOPMENT_BEARER_TOKEN"]
    )
    assert status == 200
    assert payload == {"status": "ok"}

    preflight = Request(
        "http://127.0.0.1:8000/profiles",
        method="OPTIONS",
        headers={
            "Origin": "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    with urlopen(preflight, timeout=5) as response:
        assert response.status == 200
        assert response.headers["access-control-allow-origin"] == (
            "chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        )


if __name__ == "__main__":
    assert_environment()
    assert_http_contracts()
    print("Validated backend configuration")
