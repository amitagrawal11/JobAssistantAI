from __future__ import annotations

from dataclasses import dataclass

from app.tailoring.resume_builder import ResumeBuilder


@dataclass
class Fact:
    id: str
    category: str
    fact_key: str
    fact_value: str
    verified: bool = True


@dataclass
class Change:
    id: str
    section: str
    original_text: str
    proposed_text: str
    status: object
    evidence_fact_ids: list[str]
    classification: str = "REPHRASED"


@dataclass
class Status:
    value: str


def test_builds_stable_sections_from_verified_facts() -> None:
    facts = [
        Fact("f-2", "skills", "typescript", "TypeScript"),
        Fact("f-1", "summary", "summary", "Frontend architect"),
    ]

    resume = ResumeBuilder().build("Amit Agrawal", "amit@example.com", {}, facts)

    assert [section.id for section in resume.sections] == ["summary", "skills"]
    assert resume.sections[0].items[0].id == "fact-f-1"
    assert resume.sections[0].items[0].source_fact_ids == ["f-1"]


def test_only_approved_supported_changes_affect_current_snapshot() -> None:
    facts = [Fact("f-1", "summary", "summary", "Frontend architect")]
    changes = [
        Change("c-1", "summary", "Frontend architect", "Frontend architecture leader", Status("approved"), ["f-1"]),
        Change("c-2", "summary", "", "Invented claim", Status("approved"), []),
        Change("c-3", "summary", "Frontend architect", "Dismissed copy", Status("rejected"), ["f-1"]),
    ]

    resume = ResumeBuilder().apply_changes(
        ResumeBuilder().build("Amit Agrawal", "amit@example.com", {}, facts),
        changes,
    )

    assert resume.sections[0].items[0].value == "Frontend architecture leader"
    assert "Invented claim" not in resume.plain_text
    assert "Dismissed copy" not in resume.plain_text
