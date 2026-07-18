"""Backend-backed fictional profile create/edit/verify journey."""

from __future__ import annotations

import json
import os
import uuid
from urllib.request import Request, urlopen

from app.db.entities import (
    Operation,
    OperationStatus,
    ParseRun,
    ProfileFact,
    RecordStatus,
    SourceDocument,
)
from app.db.session import get_session_factory
from smoke_cleanup import register_profile


BASE_URL = os.environ.get("PROFILE_API_BASE_URL", "http://127.0.0.1:8000")
TOKEN = os.environ["DEVELOPMENT_BEARER_TOKEN"]


def request(method: str, path: str, body: dict[str, object] | None = None):
    encoded = json.dumps(body).encode() if body is not None else None
    call = Request(
        f"{BASE_URL}{path}",
        data=encoded,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    with urlopen(call, timeout=10) as response:
        return response.status, json.load(response)


def seed_parser_fact(profile_id: str) -> None:
    with get_session_factory()() as session, session.begin():
        operation = Operation(
            profile_id=uuid.UUID(profile_id),
            operation_type="parse_profile",
            status=OperationStatus.succeeded,
            progress=100,
            payload={},
        )
        session.add(operation)
        session.flush()
        document = SourceDocument(
            profile_id=uuid.UUID(profile_id),
            filename="fictional-resume.pdf",
            media_type="application/pdf",
            storage_key=f"profiles/{profile_id}/fictional-resume.pdf",
            size_bytes=128,
            sha256="0" * 64,
            status=RecordStatus.ready,
        )
        session.add(document)
        session.flush()
        parse_run = ParseRun(
            source_document_id=document.id,
            operation_id=operation.id,
            parser="fictional-parser",
            parser_version="1.0",
            status=OperationStatus.succeeded,
            parser_metadata={},
        )
        session.add(parse_run)
        session.flush()
        session.add(
            ProfileFact(
                profile_id=uuid.UUID(profile_id),
                parse_run_id=parse_run.id,
                source_document_id=document.id,
                category="experience",
                fact_key="current_title",
                fact_value="Frontend Engineer",
                confidence=0.97,
                verified=False,
                provenance={"parser_element": "text-42"},
                page_number=1,
                bounding_box=[72.0, 96.0, 310.0, 114.0],
                element_ids=["text-42"],
                correction_version=0,
                is_current=True,
            )
        )


def main() -> None:
    status, profile = request(
        "POST",
        "/profiles",
        {"display_name": "Jordan Lee", "email": "jordan@example.test"},
    )
    assert status == 201
    assert profile["readiness"] == "uploaded"
    profile_id = profile["id"]
    register_profile(profile_id)

    status, profile = request("GET", f"/profiles/{profile_id}")
    assert status == 200
    assert profile["display_name"] == "Jordan Lee"

    status, profile = request(
        "PATCH", f"/profiles/{profile_id}", {"display_name": "Jordan A. Lee"}
    )
    assert status == 200
    assert profile["display_name"] == "Jordan A. Lee"

    status, other_profile = request(
        "POST",
        "/profiles",
        {"display_name": "Earlier Profile"},
    )
    assert status == 201
    register_profile(other_profile["id"])
    status, profile = request(
        "PATCH", f"/profiles/{profile_id}", {"display_name": "Jordan Latest Lee"}
    )
    assert status == 200
    status, profiles = request("GET", "/profiles")
    assert status == 200
    listed_ids = [item["id"] for item in profiles]
    assert listed_ids.index(profile_id) < listed_ids.index(other_profile["id"])

    seed_parser_fact(profile_id)
    status, seeded = request("GET", f"/profiles/{profile_id}")
    assert status == 200
    assert seeded["readiness"] == "needs_review"
    fact = seeded["facts"][0]
    assert fact["source"]["page"] == 1
    assert fact["source"]["bounding_box"] == [72.0, 96.0, 310.0, 114.0]
    assert fact["correction_version"] == 0

    status, corrected = request(
        "POST",
        f"/profiles/{profile_id}/facts/verify",
        {
            "facts": [
                {
                    "fact_id": fact["id"],
                    "value": "Senior Frontend Engineer",
                    "verified": True,
                }
            ],
            "source_comparison_resolved": True,
        },
    )
    assert status == 200
    corrected_fact = corrected["facts"][0]
    assert corrected_fact["value"] == "Senior Frontend Engineer"
    assert corrected_fact["correction_version"] == 1
    assert corrected_fact["verified"] is False
    assert corrected["readiness"] == "needs_review"

    status, verified = request(
        "POST",
        f"/profiles/{profile_id}/facts/verify",
        {
            "facts": [{"fact_id": corrected_fact["id"], "verified": True}],
            "source_comparison_resolved": True,
        },
    )
    assert status == 200
    assert verified["facts"][0]["verified"] is True
    assert verified["readiness"] == "ready"

    status, reloaded = request("GET", f"/profiles/{profile_id}")
    assert status == 200
    assert reloaded == verified
    print("Validated fictional profile journey")


if __name__ == "__main__":
    main()
