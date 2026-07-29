from __future__ import annotations

from collections import Counter, defaultdict

from app.models.job import JobRequirementOutput
from app.models.match import AggregatedMatch, EvidenceClassification, MatchItem, RequirementEvidence


CATEGORY_WEIGHTS = {
    "hard_requirements": 20.0,
    "required_skills": 30.0,
    "relevant_experience": 20.0,
    "responsibilities": 15.0,
    "seniority_title": 5.0,
    "education_certifications": 5.0,
    "semantic_alignment": 5.0,
}
CLASSIFICATION_MULTIPLIER = {
    EvidenceClassification.matched: 1.0,
    EvidenceClassification.partial: 0.5,
    EvidenceClassification.missing: 0.0,
    EvidenceClassification.unknown: 0.0,
}


def normalize_agent_evidence(
    requirements: list[JobRequirementOutput],
    evidence: list[RequirementEvidence],
) -> list[RequirementEvidence]:
    """Convert incomplete or ambiguous agent output into conservative unknowns."""
    grouped: dict[str, list[RequirementEvidence]] = defaultdict(list)
    requirement_ids = {item.requirement_id for item in requirements}
    for item in evidence:
        if item.requirement_id in requirement_ids:
            grouped[item.requirement_id].append(item)

    normalized: list[RequirementEvidence] = []
    for requirement in requirements:
        candidates = grouped[requirement.requirement_id]
        if len(candidates) == 1:
            normalized.append(candidates[0])
        else:
            normalized.append(
                RequirementEvidence(
                    requirement_id=requirement.requirement_id,
                    classification=EvidenceClassification.unknown,
                    source_fact_ids=[],
                    reason="The evidence agent did not return one unambiguous, verified evaluation.",
                    confidence=0,
                )
            )
    return normalized


def aggregate_match(
    requirements: list[JobRequirementOutput],
    evidence: list[RequirementEvidence],
) -> AggregatedMatch:
    requirement_ids = {item.requirement_id for item in requirements}
    counts = Counter(item.requirement_id for item in evidence)
    if set(counts) != requirement_ids or any(count != 1 for count in counts.values()):
        raise ValueError("Every requirement must have exactly one evidence classification.")

    evidence_by_id = {item.requirement_id: item for item in evidence}
    category_counts = Counter(item.category for item in requirements)
    components: dict[str, float] = defaultdict(float)
    items: list[MatchItem] = []
    hard_gate_failures: list[str] = []
    for requirement in requirements:
        evaluation = evidence_by_id[requirement.requirement_id]
        per_item_weight = CATEGORY_WEIGHTS[requirement.category] / category_counts[requirement.category]
        contribution = round(per_item_weight * CLASSIFICATION_MULTIPLIER[evaluation.classification], 4)
        components[requirement.category] += contribution
        if requirement.hard_gate and evaluation.classification != EvidenceClassification.matched:
            hard_gate_failures.append(requirement.requirement_id)
        items.append(MatchItem(
            requirement_id=requirement.requirement_id,
            requirement=requirement.normalized_text,
            category=requirement.category,
            classification=evaluation.classification,
            source_fact_ids=evaluation.source_fact_ids,
            reason=evaluation.reason,
            confidence=evaluation.confidence,
            score_contribution=contribution,
            hard_gate=requirement.hard_gate,
        ))
    normalized_components = {category: round(components.get(category, 0.0), 4) for category in CATEGORY_WEIGHTS}
    return AggregatedMatch(
        score=round(min(100.0, sum(normalized_components.values())), 2),
        scoring_version="deterministic-v1",
        components=normalized_components,
        hard_gate_failures=hard_gate_failures,
        items=items,
    )
