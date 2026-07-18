"""Prove deterministic scoring and evidence validation."""

from __future__ import annotations

import json
import os
from pathlib import Path

import httpx

from app.models.job import JobRequirementOutput
from app.models.match import EvidenceClassification, RequirementEvidence
from app.scoring.aggregator import aggregate_match, normalize_agent_evidence


BASE_URL = os.environ.get("SCORING_API_BASE_URL", "http://127.0.0.1:8000")
HEADERS = {"Authorization": f"Bearer {os.environ['DEVELOPMENT_BEARER_TOKEN']}"}
ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    requirements = [
        JobRequirementOutput(
            requirement_id="req-react",
            category="required_skills",
            required=True,
            hard_gate=True,
            normalized_text="Production React experience",
            evidence_text="Production React experience",
            evidence_start=0,
            evidence_end=27,
        ),
        JobRequirementOutput(
            requirement_id="req-leadership",
            category="responsibilities",
            required=False,
            hard_gate=False,
            normalized_text="Mentor engineers",
            evidence_text="Mentor engineers",
            evidence_start=29,
            evidence_end=45,
        ),
    ]
    evidence = [
        RequirementEvidence(
            requirement_id="req-react",
            classification=EvidenceClassification.matched,
            source_fact_ids=["fact-react"],
            reason="Verified React fact directly supports the requirement.",
            confidence=0.95,
        ),
        RequirementEvidence(
            requirement_id="req-leadership",
            classification=EvidenceClassification.partial,
            source_fact_ids=["fact-lead"],
            reason="Verified mentoring evidence is narrower than requested.",
            confidence=0.75,
        ),
    ]
    first = aggregate_match(requirements, evidence, {"fact-react", "fact-lead"})
    second = aggregate_match(requirements, evidence, {"fact-react", "fact-lead"})
    assert json.dumps(first.model_dump(), sort_keys=True) == json.dumps(second.model_dump(), sort_keys=True)
    assert first.scoring_version == "deterministic-v1"
    assert first.score == 37.5
    assert first.hard_gate_failures == []

    bad = evidence[0].model_copy(update={"source_fact_ids": ["unverified-fact"]})
    try:
        aggregate_match(requirements, [bad, evidence[1]], {"fact-react", "fact-lead"})
    except ValueError as error:
        assert "verified" in str(error)
    else:
        raise AssertionError("Unverified evidence was accepted")

    normalized = normalize_agent_evidence(requirements, [evidence[0], evidence[0]], {"fact-react"})
    assert [item.requirement_id for item in normalized] == ["req-react", "req-leadership"]
    assert all(item.classification == EvidenceClassification.unknown for item in normalized)

    hallucinated = evidence[0].model_copy(update={"source_fact_ids": ["invented"]})
    assert normalize_agent_evidence(requirements[:1], [hallucinated], {"fact-react"})[0].classification == EvidenceClassification.unknown

    with httpx.Client(base_url=BASE_URL, headers=HEADERS, timeout=240) as client:
        providers = client.get("/ai/providers").json()["providers"]
        ollama = next(provider for provider in providers if provider["id"] == "ollama")
        if ollama["available"] and os.environ.get("SKIP_LIVE_AI") != "1":
            profile_response = client.post("/profiles", json={"display_name": "Scoring Smoke"})
            profile_response.raise_for_status()
            profile_id = profile_response.json()["id"]
            resume_path = ROOT / "shared" / "examples" / "resume" / "jordan-lee-resume.pdf"
            with resume_path.open("rb") as resume:
                upload = client.post(
                    f"/profiles/{profile_id}/documents",
                    files={"document": (resume_path.name, resume, "application/pdf")},
                )
            upload.raise_for_status()
            operation_id = upload.json()["operation_id"]
            processed = client.post(f"/operations/{operation_id}/execute")
            processed.raise_for_status()
            profile = client.get(f"/profiles/{profile_id}").json()
            verified = client.post(
                f"/profiles/{profile_id}/facts/verify",
                json={
                    "facts": [
                        {"fact_id": fact["id"], "verified": True}
                        for fact in profile["facts"]
                    ],
                    "source_comparison_resolved": True,
                },
            )
            verified.raise_for_status()
            preference = client.patch(
                f"/profiles/{profile_id}/ai-preferences",
                json={"provider": "ollama", "model": ollama["models"][0]},
            )
            preference.raise_for_status()
            job_input = json.loads(
                (ROOT / "shared" / "examples" / "jobs" / "senior-frontend-engineer.json").read_text()
            )
            analysis = client.post("/jobs/analyze", json={"profile_id": profile_id, **job_input})
            analysis.raise_for_status()
            analyzed = analysis.json()
            requirement_text = " ".join(item["normalized_text"].lower() for item in analyzed["requirements"])
            assert "api key" not in requirement_text and "switch" not in requirement_text
            scored = client.post("/matches/score", json={"profile_id": profile_id, "job_id": analyzed["job_id"]})
            scored.raise_for_status()
            assert scored.json()["scoring_version"] == "deterministic-v1"
            assert set(scored.json()["components"]) == {
                "hard_requirements",
                "required_skills",
                "relevant_experience",
                "responsibilities",
                "seniority_title",
                "education_certifications",
                "semantic_alignment",
            }

    print("Validated deterministic and agentic evidence scoring")


if __name__ == "__main__":
    main()
