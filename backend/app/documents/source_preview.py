from __future__ import annotations

import base64
import io
import json
import uuid
from collections.abc import Iterable
from pathlib import Path
from typing import Any

import pypdfium2 as pdfium
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.entities import ParseRun, ProfileFact, SourceDocument
from app.errors import DomainError
from app.models.source_preview import (
    FactRegion,
    SourcePreviewPage,
    SourcePreviewResponse,
)
from app.storage.protocol import ObjectStorage


A4_WIDTH_POINTS = 595.276
A4_HEIGHT_POINTS = 841.89
DOCX_PAGE_CHARACTER_BUDGET = 4_500


class SourcePreviewService:
    def __init__(self, session: Session, storage: ObjectStorage) -> None:
        self.session = session
        self.storage = storage
        template_root = Path(__file__).resolve().parents[2] / "templates"
        self.templates = Environment(
            loader=FileSystemLoader(template_root),
            autoescape=select_autoescape(["html", "xml"]),
        )

    def get(self, document_id: uuid.UUID) -> SourcePreviewResponse:
        document = self.session.get(SourceDocument, document_id)
        if document is None:
            raise DomainError(
                status_code=404,
                code="SOURCE_DOCUMENT_NOT_FOUND",
                message="The requested source document was not found.",
            )
        parse_run = self.session.scalar(
            select(ParseRun)
            .where(ParseRun.source_document_id == document.id)
            .order_by(ParseRun.created_at.desc())
            .limit(1)
        )
        if parse_run is None:
            raise DomainError(
                status_code=409,
                code="SOURCE_PREVIEW_NOT_READY",
                message="The source preview is available after parsing completes.",
                retryable=True,
            )
        neutral = self._load_neutral(parse_run)
        facts = list(
            self.session.scalars(
                select(ProfileFact).where(ProfileFact.parse_run_id == parse_run.id)
            )
        )
        if document.media_type == "application/pdf":
            return self._pdf_preview(document, parse_run, neutral, facts)
        return self._docx_preview(document, parse_run, neutral, facts)

    def _pdf_preview(
        self,
        document: SourceDocument,
        parse_run: ParseRun,
        neutral: dict[str, Any],
        facts: list[ProfileFact],
    ) -> SourcePreviewResponse:
        with self.storage.open(document.storage_key) as source:
            pdf = pdfium.PdfDocument(source.read())
        pages: list[SourcePreviewPage] = []
        page_sizes: dict[int, tuple[float, float]] = {}
        page_text = _text_by_source_page(neutral["elements"])
        try:
            for index in range(len(pdf)):
                page = pdf[index]
                width, height = page.get_size()
                image = page.render(scale=1.5).to_pil()
                output = io.BytesIO()
                image.save(output, format="PNG", optimize=True)
                page_number = index + 1
                page_sizes[page_number] = (float(width), float(height))
                pages.append(
                    SourcePreviewPage(
                        number=page_number,
                        width=float(width),
                        height=float(height),
                        parsed_text=page_text.get(page_number, ""),
                        image_data_url=(
                            "data:image/png;base64,"
                            + base64.b64encode(output.getvalue()).decode("ascii")
                        ),
                    )
                )
        finally:
            pdf.close()

        elements = {element["id"]: element for element in neutral["elements"]}
        regions = [
            self._pdf_fact_region(fact, elements, page_sizes) for fact in facts
        ]
        return SourcePreviewResponse(
            document_id=str(document.id),
            filename=document.filename,
            media_kind="pdf",
            parser=parse_run.parser,
            parser_version=parse_run.parser_version,
            element_count=len(neutral["elements"]),
            pages=pages,
            fact_regions=regions,
        )

    def _docx_preview(
        self,
        document: SourceDocument,
        parse_run: ParseRun,
        neutral: dict[str, Any],
        facts: list[ProfileFact],
    ) -> SourcePreviewResponse:
        chunks = list(_paginate_elements(neutral["elements"]))
        element_pages = {
            element["id"]: page_number
            for page_number, chunk in enumerate(chunks, start=1)
            for element in chunk
        }
        template = self.templates.get_template("source-preview.html.j2")
        pages = [
            SourcePreviewPage(
                number=page_number,
                width=A4_WIDTH_POINTS,
                height=A4_HEIGHT_POINTS,
                parsed_text=_readable_text(elements),
                html=template.render(elements=elements),
            )
            for page_number, elements in enumerate(chunks, start=1)
        ]
        regions = [
            FactRegion(
                fact_id=str(fact.id),
                page_number=_fact_page(fact, element_pages),
                available=False,
                reason="DOCX_SOURCE_LAYOUT_APPROXIMATED",
            )
            for fact in facts
        ]
        return SourcePreviewResponse(
            document_id=str(document.id),
            filename=document.filename,
            media_kind="docx",
            parser=parse_run.parser,
            parser_version=parse_run.parser_version,
            element_count=len(neutral["elements"]),
            pages=pages,
            fact_regions=regions,
        )

    def _load_neutral(self, parse_run: ParseRun) -> dict[str, Any]:
        key = parse_run.parser_metadata.get("neutral_storage_key")
        if not isinstance(key, str) or not self.storage.exists(key):
            raise DomainError(
                status_code=409,
                code="SOURCE_PREVIEW_NOT_READY",
                message="The neutral source preview is unavailable.",
                retryable=True,
            )
        with self.storage.open(key) as source:
            return json.load(source)

    @staticmethod
    def _pdf_fact_region(
        fact: ProfileFact,
        elements: dict[str, dict[str, Any]],
        page_sizes: dict[int, tuple[float, float]],
    ) -> FactRegion:
        element = next(
            (elements[element_id] for element_id in fact.element_ids if element_id in elements),
            None,
        )
        if element is None or fact.page_number not in page_sizes:
            return FactRegion(
                fact_id=str(fact.id),
                page_number=fact.page_number or 1,
                available=False,
                reason="SOURCE_REGION_UNAVAILABLE",
            )
        provenance_items = element.get("provenance", {}).get("items") or []
        primary = provenance_items[0] if provenance_items else {}
        bbox = primary.get("bbox") or {}
        normalized = _normalized_box(
            bbox,
            *page_sizes[fact.page_number],
        )
        if normalized is None:
            return FactRegion(
                fact_id=str(fact.id),
                page_number=fact.page_number,
                available=False,
                reason="SOURCE_REGION_UNAVAILABLE",
            )
        return FactRegion(
            fact_id=str(fact.id),
            page_number=fact.page_number,
            available=True,
            normalized_box=normalized,
        )


def _paginate_elements(elements: list[dict[str, Any]]) -> Iterable[list[dict[str, Any]]]:
    page: list[dict[str, Any]] = []
    characters = 0
    for element in elements:
        length = len(str(element.get("text") or "")) + 80
        if page and characters + length > DOCX_PAGE_CHARACTER_BUDGET:
            yield page
            page = []
            characters = 0
        page.append(element)
        characters += length
    if page:
        yield page


def _text_by_source_page(elements: list[dict[str, Any]]) -> dict[int, str]:
    grouped: dict[int, list[dict[str, Any]]] = {}
    for element in elements:
        page_number = element.get("page_number")
        page = int(page_number) if isinstance(page_number, (int, float)) else 1
        grouped.setdefault(page, []).append(element)
    return {page: _readable_text(items) for page, items in grouped.items()}


def _readable_text(elements: list[dict[str, Any]]) -> str:
    ordered = sorted(elements, key=lambda item: int(item.get("reading_order") or 0))
    return "\n\n".join(
        text
        for element in ordered
        if (text := str(element.get("text") or "").strip())
    )


def _fact_page(fact: ProfileFact, element_pages: dict[str, int]) -> int:
    return next(
        (element_pages[element_id] for element_id in fact.element_ids if element_id in element_pages),
        1,
    )


def _normalized_box(
    bbox: dict[str, Any], page_width: float, page_height: float
) -> list[float] | None:
    values = [bbox.get(key) for key in ("l", "t", "r", "b")]
    if not all(isinstance(value, (int, float)) for value in values):
        return None
    left, top, right, bottom = (float(value) for value in values)
    x_min, x_max = sorted((left, right))
    y_min, y_max = sorted((top, bottom))
    origin = str(bbox.get("coord_origin") or "BOTTOMLEFT").upper()
    normalized_top = (
        y_min / page_height if "TOPLEFT" in origin else (page_height - y_max) / page_height
    )
    return [
        _clamp(x_min / page_width),
        _clamp(normalized_top),
        _clamp((x_max - x_min) / page_width),
        _clamp((y_max - y_min) / page_height),
    ]


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))
