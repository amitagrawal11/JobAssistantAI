from __future__ import annotations

from typing import Literal

from app.models.common import ApiModel


class SourcePreviewPage(ApiModel):
    number: int
    width: float
    height: float
    image_data_url: str | None = None
    html: str | None = None


class FactRegion(ApiModel):
    fact_id: str
    page_number: int
    available: bool
    normalized_box: list[float] | None = None
    reason: str | None = None


class SourcePreviewResponse(ApiModel):
    document_id: str
    filename: str
    media_kind: Literal["pdf", "docx"]
    pages: list[SourcePreviewPage]
    fact_regions: list[FactRegion]
