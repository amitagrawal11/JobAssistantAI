"""Safe API smoke journey for profile -> job -> review pipeline -> blocked apply."""

from __future__ import annotations

import os
import time
import uuid
from datetime import datetime, timezone

import httpx

from app.db.entities import JobPosting
from app.db.session import get_session_factory
from smoke_cleanup import register_job, register_profile


BASE_URL = os.environ.get("AUTO_APPLY_API_BASE_URL", "http://127.0.0.1:8000")
HEADERS = {"Authorization": f"Bearer {os.environ['DEVELOPMENT_BEARER_TOKEN']}"}


def seed_safe_posting() -> str:
    posting_id = uuid.uuid4()
    with get_session_factory()() as session, session.begin():
        session.add(
            JobPosting(
                id=posting_id,
                vendor="smoke-test",
                vendor_job_id=f"smoke-{posting_id}",
                company="Fictional Systems",
                title="Frontend Engineer",
                location="Remote",
                hosted_url="https://example.test/jobs/frontend-engineer",
                apply_url="https://example.test/jobs/frontend-engineer/apply",
                last_seen_at=datetime.now(timezone.utc),
                source_fingerprint=str(posting_id),
            )
        )
    return register_job(str(posting_id))


def main() -> None:
    with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=20) as client:
        profile = client.post(
            "/profiles",
            json={"display_name": "Pipeline Smoke", "email": "pipeline@example.test"},
        )
        profile.raise_for_status()
        profile_id = register_profile(profile.json()["id"])
        posting_id = seed_safe_posting()

        created = client.post(
            "/auto-apply/pipelines",
            json={
                "profile_id": profile_id,
                "job_posting_ids": [posting_id],
                "execution_mode": "review",
            },
        )
        assert created.status_code == 201, created.text
        pipeline = created.json()
        assert pipeline["status"] == "running"
        item = pipeline["items"][0]
        assert item["status"] == "awaiting_approval"
        assert item["stage"] == "ready_for_review"

        approved = client.post(
            f"/auto-apply/queue/{item['id']}/action",
            json={"action": "approve"},
        )
        approved.raise_for_status()
        assert approved.json()["status"] == "queued"

        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            listed = client.get("/auto-apply/pipelines", params={"profile_id": profile_id})
            listed.raise_for_status()
            pipeline = listed.json()["items"][0]
            item = pipeline["items"][0]
            if item["stage"] == "blocked":
                break
            time.sleep(0.2)
        else:
            raise AssertionError("Auto-Apply worker did not process the approved item")

        assert pipeline["status"] == "paused"
        assert item["status"] == "awaiting_approval"
        assert item["last_error"] == "Automatic submission is not yet supported for Smoke-Test."
        assert item["application_url"].startswith("https://example.test/")
        assert [event["stage"] for event in item["events"]] == [
            "queued",
            "preparing",
            "blocked",
        ]

        cancelled = client.patch(
            f"/auto-apply/pipelines/{pipeline['id']}",
            json={"action": "cancel"},
        )
        cancelled.raise_for_status()
        assert cancelled.json()["status"] == "cancelled"

    print("Validated safe profile-to-Auto-Apply pipeline journey")


if __name__ == "__main__":
    main()
