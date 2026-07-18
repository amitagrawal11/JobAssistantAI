"""Validate the description-only Job Analyst request contract."""

from __future__ import annotations

from pydantic import ValidationError

from app.models.job import JobAnalyzeRequest


def rejected(payload: dict[str, object]) -> None:
    try:
        JobAnalyzeRequest.model_validate(payload)
    except ValidationError:
        return
    raise AssertionError(f"Invalid job request was accepted: {payload.keys()}")


def main() -> None:
    valid = JobAnalyzeRequest.model_validate({
        "profile_id": "00000000-0000-4000-8000-000000000001",
        "description": "Build accessible React applications.",
    })
    assert valid.description == "Build accessible React applications."
    rejected({"profile_id": valid.profile_id, "description": "too short"})
    for field in ("title", "company", "location", "source_url"):
        rejected({
            "profile_id": valid.profile_id,
            "description": valid.description,
            field: "removed field",
        })
    print("Validated description-only job request contract")


if __name__ == "__main__":
    main()
