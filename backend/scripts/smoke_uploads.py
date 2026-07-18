"""Positive and negative resume-upload contract journey."""

from __future__ import annotations

import hashlib
import os
from pathlib import Path

import httpx
from sqlalchemy import select

from app.config import get_settings
from app.db.entities import SourceDocument
from app.db.session import get_session_factory
from app.storage.filesystem import FilesystemStorage
from smoke_cleanup import register_profile


BASE_URL = os.environ.get("UPLOAD_API_BASE_URL", "http://127.0.0.1:8000")
ROOT = Path(__file__).resolve().parents[2]
FIXTURES = ROOT / "shared" / "examples" / "resume"
HEADERS = {
    "Authorization": f"Bearer {os.environ['DEVELOPMENT_BEARER_TOKEN']}"
}


def create_profile(client: httpx.Client) -> str:
    response = client.post(
        "/profiles",
        headers=HEADERS,
        json={"display_name": "Jordan Lee", "email": "jordan@example.test"},
    )
    response.raise_for_status()
    return register_profile(response.json()["id"])


def upload(
    client: httpx.Client,
    profile_id: str,
    *,
    filename: str,
    media_type: str,
    content: bytes,
) -> httpx.Response:
    return client.post(
        f"/profiles/{profile_id}/documents",
        headers=HEADERS,
        files={"document": (filename, content, media_type)},
    )


def assert_error(response: httpx.Response, status: int, code: str) -> None:
    assert response.status_code == status, response.text
    assert response.json()["error"]["code"] == code


def main() -> None:
    pdf = (FIXTURES / "jordan-lee-resume.pdf").read_bytes()
    docx = (FIXTURES / "jordan-lee-resume.docx").read_bytes()

    with httpx.Client(base_url=BASE_URL, timeout=20) as client:
        profile_id = create_profile(client)

        pdf_response = upload(
            client,
            profile_id,
            filename="../../Jordan Lee Resume.pdf",
            media_type="application/pdf",
            content=pdf,
        )
        assert pdf_response.status_code == 202, pdf_response.text
        uploaded_pdf = pdf_response.json()
        assert uploaded_pdf["filename"] == "Jordan_Lee_Resume.pdf"
        assert uploaded_pdf["sha256"] == hashlib.sha256(pdf).hexdigest()
        assert uploaded_pdf["size_bytes"] == len(pdf)

        docx_response = upload(
            client,
            profile_id,
            filename="jordan-lee-resume.docx",
            media_type=(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ),
            content=docx,
        )
        assert docx_response.status_code == 202, docx_response.text
        assert docx_response.json()["sha256"] == hashlib.sha256(docx).hexdigest()

        assert_error(
            upload(
                client,
                profile_id,
                filename="renamed.pdf",
                media_type="application/pdf",
                content=b"plain text pretending to be a PDF",
            ),
            422,
            "INVALID_DOCUMENT_SIGNATURE",
        )
        assert_error(
            upload(
                client,
                profile_id,
                filename="invalid.docx",
                media_type=(
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ),
                content=b"PK\x03\x04not-a-valid-office-document",
            ),
            422,
            "INVALID_DOCUMENT_SIGNATURE",
        )
        assert_error(
            upload(
                client,
                profile_id,
                filename="resume.txt",
                media_type="text/plain",
                content=b"unsupported document",
            ),
            415,
            "INVALID_DOCUMENT_TYPE",
        )
        assert_error(
            upload(
                client,
                profile_id,
                filename="oversized.pdf",
                media_type="application/pdf",
                content=b"%PDF-" + b"0" * get_settings().max_document_bytes,
            ),
            413,
            "DOCUMENT_TOO_LARGE",
        )

    with get_session_factory()() as session:
        stored = list(
            session.scalars(
                select(SourceDocument).where(SourceDocument.profile_id == profile_id)
            )
        )
        assert len(stored) == 2
        storage = FilesystemStorage(get_settings().storage_root)
        assert all(storage.exists(document.storage_key) for document in stored)
        assert {document.sha256 for document in stored} == {
            hashlib.sha256(pdf).hexdigest(),
            hashlib.sha256(docx).hexdigest(),
        }

    print("Validated resume upload boundaries")


if __name__ == "__main__":
    main()
