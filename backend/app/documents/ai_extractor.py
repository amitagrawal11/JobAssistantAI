from __future__ import annotations

import json
from collections.abc import Iterable

from app.ai.registry import ProviderRegistry
from app.config import get_settings
from app.documents.profile_extraction_prompt import PROFILE_EXTRACTION_PROMPT, PROFILE_EXTRACTION_PROMPT_VERSION
from app.models.ai import AgentRequest
from app.models.parsed_document import NormalizedFact, ParsedDocument
from app.models.profile_extraction import ExtractedProfileFact, ProfileExtractionOutput


def extract_candidate_facts(document: ParsedDocument, provider_id: str, model: str) -> list[NormalizedFact]:
    elements = [
        {
            "id": element.id,
            "type": element.element_type,
            "text": element.text,
            "page": element.page_number,
            "reading_order": element.reading_order,
        }
        for element in document.elements
        if element.text.strip()
    ]
    provider = ProviderRegistry(get_settings()).get(provider_id)
    extracted: list[ExtractedProfileFact] = []
    character_budget = 9_000 if provider_id == "ollama" else 24_000
    for chunk_number, chunk in enumerate(_element_chunks(elements, character_budget), start=1):
        result = provider.run_structured(
            AgentRequest(
                role="profile_extractor",
                provider=provider_id,
                model=model,
                prompt_version=PROFILE_EXTRACTION_PROMPT_VERSION,
                schema_version="profile-extraction-v1",
                inputs={
                    "instructions": PROFILE_EXTRACTION_PROMPT,
                    "chunk": f"{chunk_number}",
                    "untrusted_docling_elements": "<DOCLING_ELEMENTS>" + json.dumps(chunk) + "</DOCLING_ELEMENTS>",
                },
            ),
            ProfileExtractionOutput,
        )
        extracted.extend(result.output.facts)
    return validate_extracted_facts(document, extracted)


def _element_chunks(elements: list[dict[str, object]], character_budget: int = 6_000) -> Iterable[list[dict[str, object]]]:
    chunk: list[dict[str, object]] = []
    size = 0
    for element in elements:
        element_size = len(json.dumps(element))
        if chunk and size + element_size > character_budget:
            yield chunk
            chunk = []
            size = 0
        chunk.append(element)
        size += element_size
    if chunk:
        yield chunk


def validate_extracted_facts(document: ParsedDocument, extracted: list[ExtractedProfileFact]) -> list[NormalizedFact]:
    elements = {element.id: element for element in document.elements}
    facts: list[NormalizedFact] = []
    seen: set[tuple[str, str]] = set()
    seen_values: set[tuple[str, str]] = set()
    for candidate in extracted:
        element_ids = list(dict.fromkeys(candidate.element_ids))
        if not element_ids or any(element_id not in elements for element_id in element_ids):
            continue
        base_key = candidate.key.strip().lower()
        category = _canonical_category(candidate.category.strip().lower(), base_key)
        cleaned_value = " ".join(candidate.value.split())
        value_signature = (category.casefold(), cleaned_value.casefold())
        if value_signature in seen_values:
            continue
        key = base_key
        suffix = 2
        while (category.casefold(), key.casefold()) in seen:
            key = f"{base_key}_{suffix}"
            suffix += 1
        signature = (category.casefold(), key.casefold())
        seen.add(signature)
        seen_values.add(value_signature)
        primary = elements[element_ids[0]]
        facts.append(NormalizedFact(
            category=category,
            key=key,
            value=cleaned_value,
            confidence=candidate.confidence,
            element_ids=element_ids,
            page_number=primary.page_number,
            bounding_box=primary.bounding_box,
        ))
    if not facts:
        raise ValueError("The profile extraction agent returned no evidence-grounded facts.")
    return facts


def _canonical_category(category: str, key: str) -> str:
    if key in {"full_name", "current_title", "location"}:
        return "identity"
    if key in {"email", "phone", "linkedin", "github", "website"}:
        return "contact"
    return category
