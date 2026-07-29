from __future__ import annotations

from dataclasses import dataclass, field

from app.autoapply.execution import ExecutionOutcome, apply_outcome, begin_attempt


@dataclass
class Item:
    queue_metadata: dict = field(default_factory=dict)
    error: str | None = None


def test_begin_attempt_records_stage_and_immutable_event() -> None:
    item = Item()

    begin_attempt(item, now="2026-07-30T00:00:00+00:00")

    assert item.queue_metadata["stage"] == "preparing"
    assert item.queue_metadata["attempt_count"] == 1
    assert item.queue_metadata["events"] == [{
        "at": "2026-07-30T00:00:00+00:00",
        "stage": "preparing",
        "message": "Preparing application",
        "attempt": 1,
        "error_code": None,
    }]


def test_blocked_outcome_preserves_action_url_and_reason() -> None:
    item = Item(queue_metadata={"attempt_count": 1, "events": []})

    apply_outcome(item, ExecutionOutcome.blocked(
        "CAPTCHA_REQUIRED", "Complete the CAPTCHA in the employer form.", "https://jobs.example/apply"
    ), now="2026-07-30T00:01:00+00:00")

    assert item.queue_metadata["stage"] == "blocked"
    assert item.queue_metadata["application_url"] == "https://jobs.example/apply"
    assert item.queue_metadata["retryable"] is False
    assert item.error == "Complete the CAPTCHA in the employer form."


def test_retryable_outcome_stops_retrying_after_three_attempts() -> None:
    item = Item(queue_metadata={"attempt_count": 3, "events": []})

    apply_outcome(item, ExecutionOutcome.retryable("NETWORK_ERROR", "Temporary failure"), now="now")

    assert item.queue_metadata["stage"] == "failed"
    assert item.queue_metadata["retryable"] is False
