from __future__ import annotations

from typing import Literal

from app.models.common import ApiModel


class DocumentUploadResponse(ApiModel):
    document_id: str
    operation_id: str
    filename: str
    media_type: str
    size_bytes: int
    sha256: str
    status: Literal["pending"]


class DocumentParseResponse(ApiModel):
    operation_id: str
    parse_run_id: str
    document_id: str
    status: Literal["succeeded"]


class DocumentReprocessResponse(ApiModel):
    document_id: str
    operation_id: str
    status: Literal["pending"]
