"""Parse fictional PDF/DOCX resumes and validate neutral provenance."""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path

import httpx
from sqlalchemy import select

from app.config import get_settings
from app.db.entities import Operation, OperationStatus, ParseRun, Profile, ProfileFact
from app.db.session import get_session_factory
from app.storage.filesystem import FilesystemStorage
from smoke_cleanup import register_profile


BASE_URL = os.environ.get("DOCLING_API_BASE_URL", "http://127.0.0.1:8000")
ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "shared" / "examples" / "resume"
HEADERS = {
    "Authorization": f"Bearer {os.environ['DEVELOPMENT_BEARER_TOKEN']}"
}
DOCX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)


def create_profile(client: httpx.Client) -> str:
    response = client.post(
        "/profiles",
        headers=HEADERS,
        json={"display_name": "Jordan Lee", "email": "jordan@example.test"},
    )
    response.raise_for_status()
    profile_id = register_profile(response.json()["id"])
    with get_session_factory()() as session, session.begin():
        profile = session.get(Profile, uuid.UUID(profile_id))
        assert profile is not None
        profile.ai_preferences = {"provider": "disabled", "model": "disabled"}
    return profile_id


def upload(
    client: httpx.Client, profile_id: str, filename: str, media_type: str
) -> dict[str, str]:
    response = client.post(
        f"/profiles/{profile_id}/documents",
        headers=HEADERS,
        files={
            "document": (filename, (FIXTURES / filename).read_bytes(), media_type)
        },
    )
    response.raise_for_status()
    return response.json()


def process(operation_id: str) -> None:
    with httpx.Client(base_url=BASE_URL, timeout=120) as client:
        response = client.post(
            f"/operations/{operation_id}/execute", headers=HEADERS
        )
        response.raise_for_status()
        assert response.json()["status"] == "succeeded"


def main() -> None:
    with httpx.Client(base_url=BASE_URL, timeout=30) as client:
        profile_id = create_profile(client)
        pdf_upload = upload(
            client, profile_id, "jordan-lee-resume.pdf", "application/pdf"
        )
        docx_upload = upload(
            client, profile_id, "jordan-lee-resume.docx", DOCX_MEDIA_TYPE
        )

    process(pdf_upload["operation_id"])
    process(docx_upload["operation_id"])

    settings = get_settings()
    storage = FilesystemStorage(settings.storage_root)
    pdf_document_id = uuid.UUID(pdf_upload["document_id"])
    with get_session_factory()() as session, session.begin():
        pdf_runs = list(
            session.scalars(
                select(ParseRun)
                .where(ParseRun.source_document_id == pdf_document_id)
                .order_by(ParseRun.created_at)
            )
        )
        assert len(pdf_runs) == 1
        first_run_id = pdf_runs[0].id
        pdf_facts = list(
            session.scalars(
                select(ProfileFact).where(ProfileFact.parse_run_id == first_run_id)
            )
        )
        assert pdf_facts
        assert all(fact.page_number is not None for fact in pdf_facts)

        neutral_key = pdf_runs[0].parser_metadata["neutral_storage_key"]
        lossless_key = pdf_runs[0].parser_metadata["lossless_storage_key"]
        assert storage.exists(lossless_key)
        with storage.open(lossless_key) as lossless_source:
            lossless = json.load(lossless_source)
        assert lossless["parser"] == "docling"
        assert lossless["parser_version"] != "unknown"
        assert lossless["model_versions"]
        assert lossless["document"]["texts"]
        with storage.open(neutral_key) as neutral_source:
            neutral = json.load(neutral_source)
        element_ids = {element["id"] for element in neutral["elements"]}
        assert element_ids
        assert all(
            set(fact.element_ids) <= element_ids and fact.element_ids
            for fact in pdf_facts
        )

        repeated_operation = Operation(
            profile_id=uuid.UUID(profile_id),
            operation_type="parse_document",
            status=OperationStatus.pending,
            progress=0,
            payload={"source_document_id": str(pdf_document_id)},
        )
        session.add(repeated_operation)
        session.flush()
        repeated_operation_id = str(repeated_operation.id)

    process(repeated_operation_id)

    with get_session_factory()() as session:
        pdf_runs = list(
            session.scalars(
                select(ParseRun)
                .where(ParseRun.source_document_id == pdf_document_id)
                .order_by(ParseRun.created_at)
            )
        )
        assert len(pdf_runs) == 2
        assert pdf_runs[0].id == first_run_id
        assert pdf_runs[0].parser_metadata["lossless_storage_key"] != (
            pdf_runs[1].parser_metadata["lossless_storage_key"]
        )

    with httpx.Client(base_url=BASE_URL, timeout=10) as client:
        response = client.get(f"/profiles/{profile_id}", headers=HEADERS)
        response.raise_for_status()
        profile = response.json()
        assert profile["readiness"] == "needs_review"
        assert profile["facts"]
        assert all(not fact["verified"] for fact in profile["facts"])

        pdf_preview_response = client.get(
            f"/documents/{pdf_upload['document_id']}/source-preview",
            headers=HEADERS,
        )
        pdf_preview_response.raise_for_status()
        pdf_preview = pdf_preview_response.json()
        assert pdf_preview["media_kind"] == "pdf"
        assert pdf_preview["parser"] == "docling"
        assert pdf_preview["parser_version"]
        assert pdf_preview["element_count"] > 0
        assert any(page["parsed_text"].strip() for page in pdf_preview["pages"])
        assert pdf_preview["pages"][0]["image_data_url"].startswith(
            "data:image/png;base64,"
        )
        assert pdf_preview["fact_regions"]
        assert all(region["available"] for region in pdf_preview["fact_regions"])
        assert all(
            0 <= coordinate <= 1
            for region in pdf_preview["fact_regions"]
            for coordinate in region["normalized_box"]
        )

        docx_preview_response = client.get(
            f"/documents/{docx_upload['document_id']}/source-preview",
            headers=HEADERS,
        )
        docx_preview_response.raise_for_status()
        docx_preview = docx_preview_response.json()
        assert docx_preview["media_kind"] == "docx"
        assert docx_preview["parser"] == "docling"
        assert docx_preview["element_count"] > 0
        assert any(page["parsed_text"].strip() for page in docx_preview["pages"])
        assert "<script" not in docx_preview["pages"][0]["html"].lower()
        assert 'src="http' not in docx_preview["pages"][0]["html"].lower()
        assert 'href="http' not in docx_preview["pages"][0]["html"].lower()
        assert all(
            not region["available"]
            and region["reason"] == "DOCX_SOURCE_LAYOUT_APPROXIMATED"
            for region in docx_preview["fact_regions"]
        )

        reprocess_response = client.post(
            f"/documents/{pdf_upload['document_id']}/reprocess",
            headers=HEADERS,
        )
        reprocess_response.raise_for_status()
        assert reprocess_response.json()["status"] == "pending"

    print("Validated Docling parsing and neutral provenance")


if __name__ == "__main__":
    main()
