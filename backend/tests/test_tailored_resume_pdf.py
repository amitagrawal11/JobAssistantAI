from app.models.tailoring import CanonicalResumeOutput, ResumeItemOutput, ResumeSectionOutput
from app.tailoring.pdf_renderer import TailoredResumePdfRenderer, pdf_filename


def fixture_resume() -> CanonicalResumeOutput:
    return CanonicalResumeOutput(
        name="Amit Agrawal",
        email="amit@example.com",
        contact={"location": "Bengaluru"},
        sections=[
            ResumeSectionOutput(
                id="summary",
                title="Professional Summary",
                items=[ResumeItemOutput(id="fact-1", label="Summary", value="Frontend architect", source_fact_ids=["1"])],
            )
        ],
    )


def test_clean_html_uses_a4_and_contains_no_review_overlays() -> None:
    html = TailoredResumePdfRenderer().render_html(fixture_resume(), "Senior Engineer", "Acme")

    assert "@page" in html
    assert "size: A4" in html
    assert "Frontend architect" in html
    assert "review-overlay" not in html


def test_pdf_filename_is_deterministic_and_safe() -> None:
    assert pdf_filename("Amit Agrawal", "Acme / Labs", "Senior Engineer") == (
        "Amit-Agrawal_Acme-Labs_Senior-Engineer.pdf"
    )
