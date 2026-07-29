from __future__ import annotations

from collections import defaultdict
from copy import deepcopy
from typing import Iterable

from app.models.tailoring import CanonicalResumeOutput, ResumeItemOutput, ResumeSectionOutput


SECTION_ORDER = [
    "summary", "experience", "employment", "projects", "skills",
    "education", "certifications", "awards", "languages", "additional",
]
SECTION_TITLES = {
    "summary": "Professional Summary",
    "experience": "Experience",
    "employment": "Experience",
    "projects": "Projects",
    "skills": "Skills",
    "education": "Education",
    "certifications": "Certifications",
    "awards": "Awards",
    "languages": "Languages",
    "additional": "Additional Information",
}


def _section_key(value: str) -> str:
    normalized = value.strip().lower().replace(" ", "_")
    for key in SECTION_ORDER:
        if key in normalized:
            return key
    return "additional"


class ResumeBuilder:
    def build(self, name: str, email: str | None, contact: dict, facts: Iterable) -> CanonicalResumeOutput:
        grouped: dict[str, list] = defaultdict(list)
        for fact in facts:
            if getattr(fact, "verified", False):
                grouped[_section_key(fact.category)].append(fact)
        sections: list[ResumeSectionOutput] = []
        for section_id in SECTION_ORDER:
            items = sorted(grouped.get(section_id, []), key=lambda item: (item.fact_key, str(item.id)))
            if not items:
                continue
            sections.append(ResumeSectionOutput(
                id=section_id,
                title=SECTION_TITLES[section_id],
                items=[
                    ResumeItemOutput(
                        id=f"fact-{fact.id}", label=fact.fact_key.replace("_", " ").strip().title(),
                        value=fact.fact_value.strip(), source_fact_ids=[str(fact.id)],
                    )
                    for fact in items
                ],
            ))
        clean_contact = {str(key): str(value) for key, value in contact.items() if value}
        return CanonicalResumeOutput(
            name=name.strip(), email=email, contact=clean_contact, sections=sections,
        )

    def apply_changes(self, source: CanonicalResumeOutput, changes: Iterable) -> CanonicalResumeOutput:
        current = deepcopy(source)
        for change in changes:
            status = getattr(change.status, "value", change.status)
            if status != "approved" or not change.evidence_fact_ids:
                continue
            target_ids = set(change.evidence_fact_ids)
            candidates = [
                item for section in current.sections for item in section.items
                if target_ids.intersection(item.source_fact_ids)
            ]
            target = next(
                (item for item in candidates if change.original_text and change.original_text in item.value),
                candidates[0] if candidates else None,
            )
            if target is None:
                continue
            if change.original_text and change.original_text in target.value:
                target.value = target.value.replace(change.original_text, change.proposed_text, 1)
            else:
                target.value = change.proposed_text
        return current
