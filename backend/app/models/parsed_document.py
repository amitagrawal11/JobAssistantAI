from __future__ import annotations

from typing import Any

from pydantic import Field

from app.models.common import ApiModel


class ParsedPage(ApiModel):
    number: int
    width: float | None = None
    height: float | None = None


class ParsedElement(ApiModel):
    id: str
    element_type: str
    text: str
    page_number: int | None = None
    bounding_box: list[float] | None = None
    reading_order: int
    parent_id: str | None = None
    child_ids: list[str] = Field(default_factory=list)
    provenance: dict[str, Any] = Field(default_factory=dict)


class ParsedDocument(ApiModel):
    document_id: str
    parser: str
    parser_version: str
    model_versions: dict[str, str] = Field(default_factory=dict)
    pages: list[ParsedPage]
    elements: list[ParsedElement]
    provenance: dict[str, Any] = Field(default_factory=dict)


class NormalizedFact(ApiModel):
    category: str
    key: str
    value: str
    confidence: float
    element_ids: list[str]
    page_number: int | None = None
    bounding_box: list[float] | None = None
