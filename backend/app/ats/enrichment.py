from __future__ import annotations

import re
from dataclasses import dataclass, field

EXTRACTOR_VERSION = "deterministic-v1"


@dataclass(slots=True)
class JobEnrichment:
    max_experience: str = "unknown"
    experience_min: int | None = None
    experience_max: int | None = None
    degree_level: str = "unknown"
    sponsorship: str = "unknown"
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    salary_period: str | None = None
    skills: list[str] = field(default_factory=list)
    languages: list[str] = field(default_factory=list)
    industry: str = "unknown"
    travel: str = "unknown"
    evidence: list[dict] = field(default_factory=list)


def _add(result: JobEnrichment, attribute: str, value: object, match: re.Match[str]) -> None:
    result.evidence.append({
        "attribute": attribute,
        "value": value,
        "confidence": 1.0,
        "excerpt": match.group(0),
        "start": match.start(),
        "end": match.end(),
        "method": "deterministic",
        "version": EXTRACTOR_VERSION,
    })


def enrich_job_description(source: str | None) -> JobEnrichment:
    result = JobEnrichment()
    if not source:
        return result

    years = re.search(r"\b(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*years?\b", source, re.I)
    if not years:
        years = re.search(r"\b(?:at least|min(?:imum)?(?: of)?)\s*(\d{1,2})\s*\+?\s*years?\b", source, re.I)
    if years:
        low = int(years.group(1))
        high = int(years.group(2)) if years.lastindex and years.lastindex >= 2 else low
        result.experience_min, result.experience_max = low, high
        result.max_experience = (
            "none" if high == 0 else "one_to_two" if high <= 2 else
            "three_to_five" if high <= 5 else "six_to_eight" if high <= 8 else "nine_plus"
        )
        _add(result, "max_experience", result.max_experience, years)

    degree_patterns = (
        ("equivalent_experience", r"\b(?:bachelor'?s?|master'?s?|degree)[\s\S]{0,50}\bor\s+equivalent experience\b"),
        ("doctorate", r"\b(?:ph\.?d|doctorate)\b"),
        ("masters", r"\bmaster'?s?\s+(?:degree)?\b"),
        ("bachelors", r"\bbachelor'?s?\s+(?:degree)?\b"),
        ("associate", r"\bassociate'?s?\s+degree\b"),
        ("high_school", r"\bhigh school (?:diploma|degree)\b"),
    )
    for level, pattern in degree_patterns:
        match = re.search(pattern, source, re.I)
        if match:
            result.degree_level = level
            _add(result, "degree_level", level, match)
            break
    if result.degree_level == "unknown":
        result.degree_level = "none_mentioned"

    sponsorship_patterns = (
        ("available", r"\b(?:can|will|may|offers?)\s+(?:provide\s+)?(?:visa\s+)?sponsor(?:ship)?\b"),
        ("unavailable", r"\b(?:no|not eligible for|unable to provide|cannot provide).{0,20}(?:visa\s+)?sponsor(?:ship)?\b"),
        ("work_authorization_required", r"\b(?:must|need to)\s+(?:be\s+)?(?:already\s+)?authorized to work\b"),
    )
    for value, pattern in sponsorship_patterns:
        match = re.search(pattern, source, re.I)
        if match:
            result.sponsorship = value
            _add(result, "sponsorship", value, match)
            break

    salary = re.search(
        r"\b(?P<currency>USD|EUR|GBP|\$|€|£)\s*(?P<low>\d[\d,]*(?:\.\d+)?)\s*(?:-|–|to)\s*(?:USD|EUR|GBP|\$|€|£)?\s*(?P<high>\d[\d,]*(?:\.\d+)?)\s*(?:per\s+)?(?P<period>year|annual|month|hour)?",
        source, re.I,
    )
    if salary:
        currency = {"$": "USD", "€": "EUR", "£": "GBP"}.get(salary.group("currency").upper(), salary.group("currency").upper())
        result.salary_min = int(float(salary.group("low").replace(",", "")))
        result.salary_max = int(float(salary.group("high").replace(",", "")))
        result.salary_currency = currency
        result.salary_period = (salary.group("period") or "year").lower()
        _add(result, "salary", f"{result.salary_min}-{result.salary_max} {currency}", salary)

    skill_names = (
        "React", "TypeScript", "JavaScript", "Python", "Java", "C#", "C++",
        "Go", "Rust", "AWS", "Azure", "GCP", "Kubernetes", "Docker", "SQL",
        "PostgreSQL", "Node.js", "Angular", "Vue", "Next.js",
    )
    for skill in skill_names:
        match = re.search(rf"(?<![\w.+#]){re.escape(skill)}(?![\w.+#])", source, re.I)
        if match:
            result.skills.append(skill)
            _add(result, "skill", skill, match)

    for language in ("English", "Dutch", "German", "French", "Spanish", "Hindi"):
        match = re.search(rf"\b(?:fluen(?:t|cy)|proficien(?:t|cy)|working knowledge).{{0,15}}\b{language}\b|\b{language}\b.{{0,15}}\b(?:required|fluency|proficiency)\b", source, re.I)
        if match:
            result.languages.append(language)
            _add(result, "language", language, match)

    industries = {
        "fintech": r"\bfintech\b", "healthcare": r"\b(?:healthcare|health tech|medtech)\b",
        "saas": r"\bsaas\b", "ecommerce": r"\b(?:e-commerce|ecommerce)\b",
        "cybersecurity": r"\bcybersecurity\b", "artificial_intelligence": r"\b(?:artificial intelligence|generative ai)\b",
    }
    for industry, pattern in industries.items():
        match = re.search(pattern, source, re.I)
        if match:
            result.industry = industry
            _add(result, "industry", industry, match)
            break

    travel_patterns = (
        ("none", r"\b(?:no travel|travel is not required)\b"),
        ("occasional", r"\b(?:occasional travel|travel up to\s+(?:[1-2]?\d)%)\b"),
        ("regular", r"\b(?:regular|frequent) travel\b|\btravel\s+(?:[3-9]\d|100)%\b"),
    )
    for value, pattern in travel_patterns:
        match = re.search(pattern, source, re.I)
        if match:
            result.travel = value
            _add(result, "travel", value, match)
            break
    return result
