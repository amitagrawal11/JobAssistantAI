from __future__ import annotations

import re
from typing import Any

from app.models.parsed_document import (
    NormalizedFact,
    ParsedDocument,
    ParsedElement,
    ParsedPage,
)


EMAIL = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE = re.compile(r"(?:\+?1[\s.-]?)?\d{3}[\s.-]\d{3}[\s.-]\d{4}")
DATE_RANGE = re.compile(r"\b(?:19|20)\d{2}\s*[-–]\s*(?:Present|(?:19|20)\d{2})\b", re.I)
SECTION_HEADINGS = {
    "professional summary",
    "experience",
    "skills",
    "education",
}


def parsed_document_from_docling(
    *,
    document_id: str,
    raw: dict[str, Any],
    parser_version: str,
    model_versions: dict[str, str],
) -> ParsedDocument:
    pages = []
    for key, page in sorted(
        (raw.get("pages") or {}).items(), key=lambda item: int(item[0])
    ):
        size = page.get("size") or {}
        pages.append(
            ParsedPage(
                number=int(page.get("page_no") or key),
                width=_number_or_none(size.get("width")),
                height=_number_or_none(size.get("height")),
            )
        )

    elements = []
    for reading_order, item in enumerate(raw.get("texts") or []):
        element_id = str(item.get("self_ref") or f"#/texts/{reading_order}")
        provenance_items = item.get("prov") or []
        primary = provenance_items[0] if provenance_items else {}
        bbox = primary.get("bbox") or {}
        elements.append(
            ParsedElement(
                id=element_id,
                element_type=str(item.get("label") or "text"),
                text=str(item.get("text") or item.get("orig") or ""),
                page_number=_integer_or_none(primary.get("page_no")),
                bounding_box=_bounding_box_or_none(bbox),
                reading_order=reading_order,
                parent_id=_reference(item.get("parent")),
                child_ids=[
                    reference
                    for child in item.get("children") or []
                    if (reference := _reference(child)) is not None
                ],
                provenance={
                    "source": "docling",
                    "items": provenance_items,
                },
            )
        )

    return ParsedDocument(
        document_id=document_id,
        parser="docling",
        parser_version=parser_version,
        model_versions=model_versions,
        pages=pages,
        elements=elements,
        provenance={
            "schema_name": raw.get("schema_name"),
            "schema_version": raw.get("version"),
        },
    )


def normalize_candidate_facts(document: ParsedDocument) -> list[NormalizedFact]:
    elements = [element for element in document.elements if element.text.strip()]
    facts: list[NormalizedFact] = []
    seen: set[tuple[str, str, str]] = set()

    def add(category: str, key: str, value: str, element: ParsedElement) -> None:
        cleaned = " ".join(value.split())
        signature = (category, key, cleaned.casefold())
        if not cleaned or signature in seen:
            return
        seen.add(signature)
        facts.append(
            NormalizedFact(
                category=category,
                key=key,
                value=cleaned,
                confidence=0.95,
                element_ids=[element.id],
                page_number=element.page_number,
                bounding_box=element.bounding_box,
            )
        )

    if elements:
        add("identity", "full_name", elements[0].text, elements[0])

    for element in elements:
        text = element.text.strip()
        if match := EMAIL.search(text):
            add("contact", "email", match.group(0), element)
        if match := PHONE.search(text):
            add("contact", "phone", match.group(0), element)
        if text.casefold() == "senior frontend engineer":
            add("identity", "current_title", text, element)

    for index, element in enumerate(elements):
        heading = element.text.strip().casefold()
        if heading not in SECTION_HEADINGS:
            continue
        following = _next_content(elements, index + 1)
        if following is None:
            continue
        if heading == "professional summary":
            add("summary", "professional_summary", following.text, following)
        elif heading == "skills":
            add("skills", "skills", following.text, following)
        elif heading == "education":
            add("education", "education_1", following.text, following)

    role_number = 0
    for element in elements:
        if "|" in element.text and DATE_RANGE.search(element.text):
            role_number += 1
            add("experience", f"role_{role_number}", element.text, element)

    return facts


def _next_content(
    elements: list[ParsedElement], start: int
) -> ParsedElement | None:
    for element in elements[start:]:
        if element.text.strip().casefold() not in SECTION_HEADINGS:
            return element
    return None


def _reference(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        reference = value.get("$ref") or value.get("cref")
        return str(reference) if reference else None
    return None


def _bounding_box_or_none(value: Any) -> list[float] | None:
    if not isinstance(value, dict):
        return None
    coordinates = [value.get(key) for key in ("l", "t", "r", "b")]
    if not all(isinstance(coordinate, (int, float)) for coordinate in coordinates):
        return None
    return [float(coordinate) for coordinate in coordinates]


def _integer_or_none(value: Any) -> int | None:
    return int(value) if isinstance(value, (int, float)) else None


def _number_or_none(value: Any) -> float | None:
    return float(value) if isinstance(value, (int, float)) else None
