"""Validate safe provider discovery, connection checks, and saved preferences."""

from __future__ import annotations

import os

import httpx


BASE_URL = os.environ.get("AI_API_BASE_URL", "http://127.0.0.1:8000")
HEADERS = {"Authorization": f"Bearer {os.environ['DEVELOPMENT_BEARER_TOKEN']}"}


def main() -> None:
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        providers_response = client.get("/ai/providers", headers=HEADERS)
        providers_response.raise_for_status()
        providers = providers_response.json()["providers"]
        assert {provider["id"] for provider in providers} == {"ollama", "openai"}
        assert all("models" in provider and "available" in provider for provider in providers)
        assert "api_key" not in providers_response.text.lower()

        profile_response = client.post(
            "/profiles",
            headers=HEADERS,
            json={"display_name": "Provider Smoke"},
        )
        profile_response.raise_for_status()
        profile_id = profile_response.json()["id"]

        available = next((provider for provider in providers if provider["models"]), None)
        if available:
            preference_response = client.patch(
                f"/profiles/{profile_id}/ai-preferences",
                headers=HEADERS,
                json={"provider": available["id"], "model": available["models"][0]},
            )
            preference_response.raise_for_status()
            assert preference_response.json() == {
                "provider": available["id"],
                "model": available["models"][0],
            }

        openai = next(provider for provider in providers if provider["id"] == "openai")
        if not os.environ.get("OPENAI_API_KEY") or not os.environ.get("OPENAI_MODELS"):
            assert not openai["available"]
            assert openai["status"] == "not_configured"

    print("Validated safe AI provider discovery and preferences")


if __name__ == "__main__":
    main()
