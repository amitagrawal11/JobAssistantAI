from __future__ import annotations

import json
import logging
import re
from collections.abc import Iterable

logger = logging.getLogger(__name__)

# Fraction of a fact's word tokens that must appear in the document for it to be
# accepted via content-grounding when the model failed to cite valid element IDs.
_CONTENT_GROUNDING_THRESHOLD = 0.6


def _tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", text.lower()) if len(t) >= 3}


def _best_matching_element(elements: dict, value_tokens: set[str]) -> str | None:
    best_id, best_score = None, 0
    for element_id, element in elements.items():
        score = len(value_tokens & _tokens(element.text))
        if score > best_score:
            best_id, best_score = element_id, score
    return best_id

from app.ai.registry import ProviderRegistry
from app.config import get_settings
from app.documents.hybrid_extractor import COMBINED_LLM_PROMPT, SECTION_LLM_PROMPTS, build_combined_input, plan_extraction
from app.documents.profile_extraction_prompt import PROFILE_EXTRACTION_PROMPT, PROFILE_EXTRACTION_PROMPT_VERSION
from app.models.ai import AgentRequest
from app.models.parsed_document import NormalizedFact, ParsedDocument
from app.models.profile_extraction import ExtractedProfileFact, ProfileExtractionOutput


def extract_candidate_facts(document: ParsedDocument, provider_id: str, model: str) -> list[NormalizedFact]:
    """Section-guided hybrid extraction.

    Contact/summary/skills/certs are pulled deterministically from docling's
    clean text; experience/education/projects are handed to the LLM one section
    at a time so it can't drop a whole section. If no experience is recovered
    (odd layout / no headings), fall back to the whole-document LLM pass so we
    never do worse than before.
    """
    provider = ProviderRegistry(get_settings()).get(provider_id)
    plan = plan_extraction(document)
    extracted: list[ExtractedProfileFact] = list(plan.deterministic_facts)

    def _got(category: str) -> bool:
        # A section counts as extracted whether the model set the category or only
        # the keyed prefix (experience_1, education_2, project_1, …).
        return any(
            (f.category == category or f.key.lower().startswith(category)) and f.value.strip()
            for f in extracted
        )

    # One combined LLM call over just the structured sections (contact/summary/
    # skills are already handled deterministically) — far fewer round-trips than
    # a call per section while keeping the input focused enough not to drop one.
    if plan.llm_sections:
        combined = build_combined_input(plan.llm_sections)
        extracted.extend(_run_section_llm(provider, provider_id, model, "combined", COMBINED_LLM_PROMPT, combined))

    # Targeted retry: re-run only the sections the combined pass dropped (cheap,
    # since a dropped section is usually short) — keeps it fast when the model
    # behaves and reliable when it doesn't.
    for category, section_text in plan.llm_sections:
        if not _got(category):
            logger.info("hybrid combined pass missed '%s'; retrying that section alone", category)
            extracted.extend(_run_section_llm(provider, provider_id, model, category, SECTION_LLM_PROMPTS[category], section_text))

    if not _got("experience"):
        logger.info("hybrid extraction recovered no experience; running whole-document fallback")
        extracted.extend(_extract_whole_document(document, provider, provider_id, model))

    return validate_extracted_facts(document, extracted)


def _run_section_llm(provider, provider_id: str, model: str, label: str, instructions: str, text: str) -> list[ExtractedProfileFact]:
    try:
        result = provider.run_structured(
            AgentRequest(
                role="profile_extractor",
                provider=provider_id,
                model=model,
                prompt_version=PROFILE_EXTRACTION_PROMPT_VERSION,
                schema_version="profile-extraction-v1",
                inputs={
                    "instructions": instructions,
                    "section": label,
                    "untrusted_resume_text": "<RESUME_SECTION>" + text + "</RESUME_SECTION>",
                },
            ),
            ProfileExtractionOutput,
        )
        return list(result.output.facts)
    except Exception:
        logger.warning("hybrid section '%s' extraction failed with %s; continuing", label, model, exc_info=True)
        return []


def _extract_whole_document(document: ParsedDocument, provider, provider_id: str, model: str) -> list[ExtractedProfileFact]:
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
    extracted: list[ExtractedProfileFact] = []
    # Keep the whole of a typical one-page resume in a single chunk. Splitting it
    # made models return an all-empty batch for the tail (education/projects).
    character_budget = 16_000 if provider_id == "ollama" else 40_000
    chunks = list(_element_chunks(elements, character_budget))

    def run_chunk(chunk: list[dict[str, object]], chunk_number: int) -> list[ExtractedProfileFact]:
        try:
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
            return list(result.output.facts)
        except Exception:
            logger.warning("profile extraction chunk %s/%s failed with %s; continuing", chunk_number, len(chunks), model, exc_info=True)
            return []

    for chunk_number, chunk in enumerate(chunks, start=1):
        facts = run_chunk(chunk, chunk_number)
        # Models occasionally return an array of empty objects for a chunk; one retry usually recovers it.
        if not any(f.key.strip() and f.value.strip() for f in facts):
            logger.warning("profile extraction chunk %s/%s returned no usable facts; retrying", chunk_number, len(chunks))
            facts = run_chunk(chunk, chunk_number)
        extracted.extend(facts)
    return extracted


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
    document_tokens = _tokens(" ".join(element.text for element in document.elements))
    facts: list[NormalizedFact] = []
    seen: set[tuple[str, str]] = set()
    seen_values: set[tuple[str, str]] = set()
    for candidate in extracted:
        base_key = candidate.key.strip().lower()
        category = _canonical_category(candidate.category.strip().lower(), base_key)
        # Strip inline element-id references some models leak into the value,
        # e.g. "... financial aggregations (#/texts/17)".
        # Strip leaked element-id references in any shape the model emits:
        # "(#/texts/16)", "(element_ids: [#/texts/16])", or a bare "element_ids: [..]".
        cleaned_value = re.sub(r"\s*\(?\s*element[_ ]?ids?\s*:?\s*\[?[^)\]]*\]?\)?", " ", candidate.value, flags=re.IGNORECASE)
        cleaned_value = re.sub(r"\s*\(?\s*#/texts/\d+\s*\)?", " ", cleaned_value)
        # Empty / punctuation-only citation brackets the model leaves behind
        # ("[ ]", "[, ' ']") and empty parens.
        cleaned_value = re.sub(r"\[[\s,;:.'\"“”‘’·|-]*\]", " ", cleaned_value)
        cleaned_value = re.sub(r"\(\s*\)", " ", cleaned_value)
        cleaned_value = " ".join(cleaned_value.split())
        cleaned_value = re.sub(r"\s+([.,;:])", r"\1", cleaned_value)  # drop space left before punctuation
        # Drop facts a weaker model returned with missing pieces.
        if not cleaned_value or not base_key or not category:
            continue
        confidence = min(1.0, max(0.0, candidate.confidence))

        # Grounding: prefer the model's cited element IDs, but local models cite
        # them unreliably. When the citation is missing/invalid, keep the fact
        # anyway if its text is verifiably present in the document (content
        # grounding). This still blocks hallucinations while recovering the many
        # real facts a weak model fails to cite correctly.
        cited = [eid for eid in dict.fromkeys(candidate.element_ids) if eid in elements]
        if cited:
            element_ids = cited
        else:
            value_tokens = _tokens(cleaned_value)
            if not value_tokens:
                continue
            coverage = sum(1 for token in value_tokens if token in document_tokens) / len(value_tokens)
            if coverage < _CONTENT_GROUNDING_THRESHOLD:
                continue
            best = _best_matching_element(elements, value_tokens)
            element_ids = [best] if best else []

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
        primary = elements.get(element_ids[0]) if element_ids else None
        facts.append(NormalizedFact(
            category=category,
            key=key,
            value=cleaned_value,
            confidence=confidence,
            element_ids=element_ids,
            page_number=primary.page_number if primary else None,
            bounding_box=primary.bounding_box if primary else [],
        ))
    if not facts:
        raise ValueError("The profile extraction agent returned no evidence-grounded facts.")
    return facts


# Key-prefix → category inference, used when the model leaves ``category`` blank
# (small local models frequently populate key/value but omit category).
_KEY_PREFIX_CATEGORY: tuple[tuple[str, str], ...] = (
    ("professional_summary", "professional_summary"),
    ("summary", "professional_summary"),
    ("total_experience", "total_experience"),
    ("experience", "experience"),
    ("work", "experience"),
    ("employment", "experience"),
    ("role", "experience"),
    ("skill", "skills"),
    ("education", "education"),
    ("degree", "education"),
    ("project", "project"),
    ("certification", "certifications"),
    ("cert", "certifications"),
    ("award", "awards"),
    ("language", "languages"),
    ("publication", "publications"),
    ("contact", "contact"),
    ("name", "identity"),
    ("title", "identity"),
)


def _canonical_category(category: str, key: str) -> str:
    if key in {"full_name", "current_title", "location"}:
        return "identity"
    if key in {"email", "phone", "linkedin", "github", "website"}:
        return "contact"
    if category:
        return category
    # The model omitted the category — infer it from the key so the fact isn't
    # discarded downstream.
    for prefix, inferred in _KEY_PREFIX_CATEGORY:
        if key.startswith(prefix):
            return inferred
    return "other"
