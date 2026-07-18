from __future__ import annotations

import io
import re
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath

from app.errors import DomainError


PDF_MEDIA_TYPE = "application/pdf"
DOCX_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)
REQUIRED_DOCX_MEMBERS = {"[Content_Types].xml", "word/document.xml"}


@dataclass(frozen=True, slots=True)
class ValidatedDocument:
    filename: str
    extension: str
    media_type: str
    content: bytes


def validate_document(
    *, filename: str, media_type: str, content: bytes, maximum_bytes: int
) -> ValidatedDocument:
    if len(content) > maximum_bytes:
        raise DomainError(
            status_code=413,
            code="DOCUMENT_TOO_LARGE",
            message=f"Resume files must be {maximum_bytes} bytes or smaller.",
        )

    sanitized = sanitize_filename(filename)
    extension = PurePosixPath(sanitized).suffix.lower()
    expected_media_type = {
        ".pdf": PDF_MEDIA_TYPE,
        ".docx": DOCX_MEDIA_TYPE,
    }.get(extension)
    if expected_media_type is None or media_type != expected_media_type:
        raise DomainError(
            status_code=415,
            code="INVALID_DOCUMENT_TYPE",
            message="Upload a PDF or DOCX resume with the matching file type.",
        )

    if extension == ".pdf":
        if not content.startswith(b"%PDF-"):
            invalid_signature()
    else:
        validate_docx_signature(content)

    return ValidatedDocument(
        filename=sanitized,
        extension=extension,
        media_type=expected_media_type,
        content=content,
    )


def sanitize_filename(filename: str) -> str:
    basename = PurePosixPath(filename.replace("\\", "/")).name
    sanitized = re.sub(r"[^A-Za-z0-9._-]+", "_", basename).strip("._")
    if not sanitized:
        raise DomainError(
            status_code=415,
            code="INVALID_DOCUMENT_TYPE",
            message="The uploaded document filename is invalid.",
        )
    return sanitized[:255]


def validate_docx_signature(content: bytes) -> None:
    if not content.startswith(b"PK\x03\x04"):
        invalid_signature()
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            names = set(archive.namelist())
            if not REQUIRED_DOCX_MEMBERS <= names:
                invalid_signature()
            if sum(member.file_size for member in archive.infolist()) > 50 * 1024 * 1024:
                invalid_signature()
            if archive.testzip() is not None:
                invalid_signature()
    except (zipfile.BadZipFile, RuntimeError, ValueError):
        invalid_signature()


def invalid_signature() -> None:
    raise DomainError(
        status_code=422,
        code="INVALID_DOCUMENT_SIGNATURE",
        message="The file contents do not match a valid PDF or DOCX document.",
    )
