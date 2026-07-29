from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal


OutcomeKind = Literal["submitted", "blocked", "retryable", "failed"]


@dataclass(frozen=True)
class ExecutionOutcome:
    kind: OutcomeKind
    code: str | None = None
    message: str = ""
    application_url: str | None = None

    @classmethod
    def submitted(cls) -> "ExecutionOutcome":
        return cls(kind="submitted", message="Application submitted successfully")

    @classmethod
    def blocked(cls, code: str, message: str, application_url: str | None = None) -> "ExecutionOutcome":
        return cls(kind="blocked", code=code, message=message, application_url=application_url)

    @classmethod
    def retryable(cls, code: str, message: str) -> "ExecutionOutcome":
        return cls(kind="retryable", code=code, message=message)

    @classmethod
    def failed(cls, code: str, message: str) -> "ExecutionOutcome":
        return cls(kind="failed", code=code, message=message)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _metadata(item) -> dict:
    return dict(item.queue_metadata or {})


def record_event(
    item, stage: str, message: str, *, error_code: str | None = None, now: str | None = None,
) -> None:
    metadata = _metadata(item)
    events = list(metadata.get("events", []))
    events.append({
        "at": now or _now(),
        "stage": stage,
        "message": message,
        "attempt": int(metadata.get("attempt_count", 0)),
        "error_code": error_code,
    })
    metadata.update({"stage": stage, "events": events[-100:]})
    item.queue_metadata = metadata


def begin_attempt(item, *, now: str | None = None) -> None:
    metadata = _metadata(item)
    metadata["attempt_count"] = int(metadata.get("attempt_count", 0)) + 1
    metadata["retryable"] = False
    item.queue_metadata = metadata
    item.error = None
    record_event(item, "preparing", "Preparing application", now=now)


def apply_outcome(item, outcome: ExecutionOutcome, *, now: str | None = None) -> str:
    metadata = _metadata(item)
    attempt_count = int(metadata.get("attempt_count", 0))
    stage = outcome.kind
    retryable = outcome.kind == "retryable" and attempt_count < 3
    if outcome.kind == "retryable":
        stage = "retry_wait" if retryable else "failed"
    metadata.update({
        "stage": stage,
        "retryable": retryable,
        "last_error_code": outcome.code,
        "application_url": outcome.application_url or metadata.get("application_url"),
    })
    item.queue_metadata = metadata
    item.error = outcome.message if outcome.kind != "submitted" else None
    record_event(item, stage, outcome.message, error_code=outcome.code, now=now)
    return stage
