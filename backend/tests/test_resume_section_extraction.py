from __future__ import annotations

from types import SimpleNamespace

from app.documents import ai_extractor
from app.documents.hybrid_extractor import plan_extraction
from app.models.parsed_document import ParsedDocument, ParsedElement
from app.models.profile_extraction import ExtractedProfileFact, ProfileExtractionOutput


def document(*rows: tuple[str, str]) -> ParsedDocument:
    return ParsedDocument(
        document_id="doc-1",
        parser="fixture",
        parser_version="1",
        pages=[],
        elements=[
            ParsedElement(
                id=f"e-{index}",
                element_type=kind,
                text=text,
                page_number=1,
                bounding_box=[1.0, float(index), 10.0, float(index + 1)],
                reading_order=index,
            )
            for index, (kind, text) in enumerate(rows)
        ],
    )


def values_for(doc: ParsedDocument, category: str) -> list[str]:
    return [
        fact.value
        for fact in plan_extraction(doc).deterministic_facts
        if fact.category == category
    ]


def test_groups_each_experience_role_with_its_achievements() -> None:
    doc = document(
        ("section_header", "Jordan Lee"),
        ("section_header", "Professional Experience"),
        ("section_header", "Example Corp"),
        ("text", "Senior Engineer"),
        ("text", "Jan 2022 - Present"),
        ("list_item", "Built an accessible design system."),
        ("section_header", "Earlier Ltd"),
        ("text", "Engineer"),
        ("text", "2019 - 2021"),
        ("list_item", "Improved page performance by 30%."),
        ("section_header", "Education"),
    )

    roles = values_for(doc, "experience")

    assert len(roles) == 2
    assert "Example Corp" in roles[0]
    assert "Built an accessible design system." in roles[0]
    assert "Earlier Ltd" in roles[1]
    assert "Improved page performance by 30%." in roles[1]


def test_emits_one_fact_per_project_list_item() -> None:
    doc = document(
        ("section_header", "Jordan Lee"),
        ("section_header", "Projects"),
        ("list_item", "Atlas: React accessibility toolkit."),
        ("list_item", "Beacon: TypeScript observability dashboard."),
    )

    assert values_for(doc, "project") == [
        "Atlas: React accessibility toolkit.",
        "Beacon: TypeScript observability dashboard.",
    ]


def test_splits_multiple_degrees_from_one_docling_element() -> None:
    doc = document(
        ("section_header", "Jordan Lee"),
        ("section_header", "Education"),
        (
            "text",
            "M.Sc. Computer Science, Example University, Aug 2018 - May 2020 "
            "B.Sc. Computing, Sample College, Jul 2014 - Jun 2018",
        ),
    )

    education = values_for(doc, "education")

    assert education == [
        "M.Sc. Computer Science, Example University, Aug 2018 - May 2020",
        "B.Sc. Computing, Sample College, Jul 2014 - Jun 2018",
    ]


def test_ai_enhancement_never_falls_back_to_the_whole_resume(monkeypatch) -> None:
    doc = document(
        ("section_header", "Jordan Lee"),
        ("section_header", "Professional Summary"),
        (
            "text",
            "Frontend engineer focused on accessible, reliable product interfaces "
            "for distributed teams and high-traffic applications.",
        ),
    )
    monkeypatch.setattr(
        ai_extractor.ProviderRegistry,
        "get",
        lambda *_: object(),
    )
    monkeypatch.setattr(
        ai_extractor,
        "_extract_whole_document",
        lambda *_: (_ for _ in ()).throw(AssertionError("whole resume was sent")),
    )

    facts = ai_extractor.extract_candidate_facts(doc, "ollama", "qwen2.5:1.5b")

    assert any(fact.category == "professional_summary" for fact in facts)


def test_ai_section_replaces_instead_of_duplicates_deterministic_entry(
    monkeypatch,
) -> None:
    doc = document(
        ("section_header", "Jordan Lee"),
        ("section_header", "Experience"),
        ("section_header", "Example Corp"),
        ("text", "Senior Engineer"),
        ("text", "Jan 2022 - Present"),
        ("list_item", "Built an accessible design system."),
    )

    class Provider:
        def run_structured(self, *_):
            return SimpleNamespace(
                output=ProfileExtractionOutput(
                    facts=[
                        ExtractedProfileFact(
                            category="experience",
                            key="experience_1",
                            value=(
                                "Company: Example Corp, Title: Senior Engineer, "
                                "Dates: Jan 2022 - Present. Achievements: Built "
                                "an accessible design system."
                            ),
                            confidence=0.9,
                            element_ids=["e-2", "e-3", "e-4", "e-5"],
                        )
                    ]
                )
            )

    monkeypatch.setattr(ai_extractor.ProviderRegistry, "get", lambda *_: Provider())

    facts = ai_extractor.extract_candidate_facts(doc, "ollama", "qwen2.5:1.5b")
    experience = [fact for fact in facts if fact.category == "experience"]

    assert len(experience) == 1
    assert experience[0].value.startswith("Company: Example Corp")
