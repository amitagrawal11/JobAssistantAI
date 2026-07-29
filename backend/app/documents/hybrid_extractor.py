"""Section-guided hybrid extraction.

The local LLM reliably drops whole sections (e.g. experience/education) when
handed a full resume. This module segments docling's clean, heading-structured
text into sections deterministically, pulls contact/summary/skills/certs with
rules, and then asks the LLM to extract ONLY one structured section at a time so
it can no longer skip it. Everything is grounded in the document text.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.models.parsed_document import ParsedDocument, ParsedElement
from app.models.profile_extraction import ExtractedProfileFact

# Canonical section -> heading phrases that mark its start (normalized, lowercase).
SECTION_HEADINGS: dict[str, list[str]] = {
    "summary": [
        "professional summary", "executive summary", "career summary", "executive profile",
        "professional profile", "career profile", "personal profile", "profile summary",
        "summary of qualifications", "professional overview", "career objective",
        "summary", "profile", "overview", "about me", "about", "objective", "snapshot",
    ],
    "experience": ["work experience", "professional experience", "employment history", "work history", "career history", "employment", "experience", "career", "relevant experience", "professional background"],
    "education": ["education", "academic background", "academic qualifications", "education & qualifications", "academic"],
    "skills": ["core competencies", "technical skills", "technical expertise", "areas of expertise", "key skills", "skills & expertise", "skills", "technologies", "competencies", "tech stack"],
    "project": ["personal projects", "key projects", "selected projects", "notable projects", "projects"],
    "certifications": ["licenses & certifications", "certifications & licenses", "certifications and courses", "certifications", "certification", "licenses", "courses & certifications"],
    "awards": ["awards & honors", "honors & awards", "awards", "honors", "achievements", "accomplishments"],
    "languages": ["languages"],
}
# Sections whose entries need structuring — handed to the focused LLM.
LLM_SECTIONS = ["experience", "education", "project"]

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_PHONE_RE = re.compile(r"(?:(?:\+|00)\d{1,3}[\s.\-]?)?(?:\(\d{1,4}\)[\s.\-]?)?\d{2,4}(?:[\s.\-]?\d{2,4}){1,4}")
_LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/(?:in|pub)/[A-Za-z0-9._%\-/]+", re.I)
_GITHUB_RE = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[A-Za-z0-9._%\-/]+", re.I)
_URL_RE = re.compile(r"(?:https?://)?(?:www\.)?[A-Za-z0-9-]+\.(?:dev|io|me|app|tech|portfolio|net|org|co)(?:/[^\s|,]*)?", re.I)
_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z.'\-]+(?:\s+[A-Za-z][A-Za-z.'\-]+){1,3}$")
_LOCATION_RE = re.compile(r"\b([A-Z][A-Za-z.]+(?:\s[A-Z][A-Za-z.]+)?),\s*([A-Z][A-Za-z.]+(?:\s[A-Z][A-Za-z.]+)?)\b")
_DIGITS_RE = re.compile(r"\d")
_DATE_RANGE_RE = re.compile(
    r"\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+)?"
    r"(?:19|20)\d{2}\s*[-–]\s*"
    r"(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+)?"
    r"(?:Present|Current|(?:19|20)\d{2})\b",
    re.I,
)


@dataclass
class ExtractionPlan:
    deterministic_facts: list[ExtractedProfileFact] = field(default_factory=list)
    llm_sections: list[tuple[str, str]] = field(default_factory=list)  # (category, section text)
    has_experience_section: bool = False


def _normalize_heading(text: str) -> str:
    return re.sub(r"[\s:|._\-]+$", "", text.strip().lower()).strip(" :|._-")


def _match_heading(text: str) -> str | None:
    raw = text.strip()
    if len(raw) > 45 or len(raw.split()) > 6:
        return None
    norm = _normalize_heading(raw)
    if not norm:
        return None
    for section, phrases in SECTION_HEADINGS.items():
        for phrase in phrases:
            if norm == phrase or norm.startswith(phrase + " ") or norm.startswith(phrase + " ("):
                return section
    return None


def _segment(document: ParsedDocument) -> tuple[list[ParsedElement], dict[str, list[ParsedElement]]]:
    elements = sorted((e for e in document.elements if e.text.strip()), key=lambda e: e.reading_order)
    header: list[ParsedElement] = []
    sections: dict[str, list[ParsedElement]] = {}
    current: str | None = None
    for el in elements:
        heading = _match_heading(el.text)
        # docling section-header elements are a strong signal but still must match a known heading.
        if heading is not None:
            current = heading
            sections.setdefault(current, [])
            continue
        if current is None:
            header.append(el)
        else:
            sections[current].append(el)
    return header, sections


def _fact(category: str, key: str, value: str, element_ids: list[str]) -> ExtractedProfileFact:
    return ExtractedProfileFact(category=category, key=key, value=value.strip(), confidence=0.9, element_ids=element_ids)


def _regex_contact_identity(header: list[ParsedElement], full_text: str) -> list[ExtractedProfileFact]:
    facts: list[ExtractedProfileFact] = []
    header_text = "\n".join(e.text for e in header)

    def _cite(needle: str) -> list[str]:
        for e in header + []:
            if needle and needle in e.text:
                return [e.id]
        return []

    # Name: first header line that looks like a person's name.
    name = None
    for e in header[:4]:
        line = e.text.strip()
        if _NAME_RE.match(line) or (line.isupper() and 1 < len(line.split()) <= 4 and not _DIGITS_RE.search(line)):
            name = " ".join(w.capitalize() if w.isupper() else w for w in line.split())
            facts.append(_fact("identity", "full_name", name, [e.id]))
            name_id = e.id
            break
    else:
        name_id = None

    # Current title: first header line after the name that is not contact noise.
    for e in header:
        if name_id and e.id == name_id:
            continue
        line = e.text.strip()
        low = line.lower()
        if "@" in line or _PHONE_RE.fullmatch(line.replace(" ", "")) or "linkedin.com" in low or "github.com" in low:
            continue
        if _DIGITS_RE.search(line) and len(line) < 25:
            continue
        if 3 < len(line) < 160 and any(c.isalpha() for c in line) and not _LOCATION_RE.fullmatch(line):
            facts.append(_fact("identity", "current_title", line.split("  ")[0].strip(), [e.id]))
            break

    email = _EMAIL_RE.search(full_text)
    if email:
        facts.append(_fact("contact", "email", email.group(0), _cite(email.group(0))))

    linkedin = _LINKEDIN_RE.search(full_text)
    if linkedin:
        facts.append(_fact("contact", "linkedin", linkedin.group(0), _cite(linkedin.group(0))))
    github = _GITHUB_RE.search(full_text)
    if github:
        facts.append(_fact("contact", "github", github.group(0), _cite(github.group(0))))

    # Phone: prefer the header; validate digit count.
    for source in (header_text, full_text):
        for m in _PHONE_RE.finditer(source):
            cand = m.group(0).strip()
            digits = re.sub(r"\D", "", cand)
            if cand.startswith("+"):
                ok = 8 <= len(digits) <= 15
            else:
                ok = 10 <= len(digits) <= 13 and (" " in cand or "-" in cand or "(" in cand)
            # Reject year ranges like "2021 - 2023".
            if ok and not re.fullmatch(r"(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}", cand):
                facts.append(_fact("contact", "mobile", cand, _cite(cand)))
                break
        if any(f.key == "mobile" for f in facts):
            break

    loc = _LOCATION_RE.search(header_text)
    if loc:
        facts.append(_fact("contact", "city", loc.group(1), []))
        facts.append(_fact("contact", "country", loc.group(2), []))

    website = None
    for m in _URL_RE.finditer(header_text):
        u = m.group(0)
        if "linkedin.com" in u.lower() or "github.com" in u.lower():
            continue
        website = u
        break
    if website:
        facts.append(_fact("contact", "website", website, _cite(website)))

    return facts


_SKILL_STOPWORDS = {
    "to", "the", "of", "for", "with", "and", "in", "on", "using", "via", "that", "which",
    "from", "as", "an", "are", "was", "were", "is", "by", "or", "their", "this", "these",
    "such", "including", "both", "over", "under", "across", "through", "into", "while",
}


def _is_skill_token(raw: str) -> bool:
    t = raw.strip().lstrip("-•").strip()
    if not (2 <= len(t) <= 40) or t.endswith(":") or not any(c.isalpha() for c in t):
        return False
    words = t.split()
    if len(words) > 5:
        return False
    return not any(w.lower().strip(".,()") in _SKILL_STOPWORDS for w in words)


def _looks_like_subheading(text: str) -> bool:
    t = text.strip()
    return 0 < len(t) <= 42 and (t.istitle() or t.isupper()) and not t.endswith((".", ",", ";"))


def _summary_from(els: list[ParsedElement]) -> tuple[str, list[str]]:
    # A professional summary is a paragraph; stop before any custom sub-heading
    # (e.g. "Architecture Impact") the segmenter didn't recognize as a boundary
    # so it doesn't bleed into the summary.
    kept: list[ParsedElement] = []
    for e in els:
        if kept and _looks_like_subheading(e.text):
            break
        kept.append(e)
    return " ".join(e.text.strip() for e in kept).strip(), [e.id for e in kept][:8]


def _deterministic_sections(header: list[ParsedElement], sections: dict[str, list[ParsedElement]]) -> list[ExtractedProfileFact]:
    facts: list[ExtractedProfileFact] = []

    summary_text, summary_ids = "", []
    if sections.get("summary"):
        summary_text, summary_ids = _summary_from(sections["summary"])
    if not summary_text:
        # No recognized summary heading — fall back to the first real paragraph in
        # the header block (after name/title/contact lines).
        para = next(
            (e for e in header
             if len(e.text.strip()) > 120 and "@" not in e.text and not e.text.strip().lower().startswith(("http", "www"))),
            None,
        )
        if para is not None:
            summary_text, summary_ids = para.text.strip(), [para.id]
    if summary_text:
        facts.append(_fact("professional_summary", "professional_summary", summary_text, summary_ids))

    if sections.get("skills"):
        idx = 1
        for e in sections["skills"]:
            # Strip a leading "Category:" label, split into tokens, keep only
            # real skill names (a skills section often absorbs prose bullets).
            line = re.sub(r"^\s*[A-Za-z][A-Za-z /&+]{0,30}:\s*", "", e.text)
            toks = [t.strip(" •-\t.") for t in re.split(r"[,;|•\t]", line)]
            toks = [t for t in toks if _is_skill_token(t)]
            if toks:
                facts.append(_fact("skills", f"skills_{idx}", ", ".join(toks), [e.id]))
                idx += 1

    if sections.get("certifications"):
        for i, e in enumerate(sections["certifications"], start=1):
            line = e.text.strip(" •-\t")
            if len(line) >= 3 and any(c.isalpha() for c in line):
                facts.append(_fact("certifications", f"certification_{i}", line, [e.id]))

    facts.extend(_structured_experience(sections.get("experience", [])))
    facts.extend(_structured_projects(sections.get("project", [])))
    facts.extend(_structured_education(sections.get("education", [])))
    return facts


def _structured_experience(elements: list[ParsedElement]) -> list[ExtractedProfileFact]:
    entries: list[list[ParsedElement]] = []
    current: list[ParsedElement] = []

    def flush() -> None:
        nonlocal current
        if current and any(_DATE_RANGE_RE.search(item.text) for item in current):
            entries.append(current)
        current = []

    for element in elements:
        is_new_heading = element.element_type == "section_header"
        current_complete = (
            any(_DATE_RANGE_RE.search(item.text) for item in current)
            and any(item.element_type == "list_item" for item in current)
        )
        if is_new_heading and current_complete:
            flush()
        current.append(element)
    flush()

    return [
        _fact(
            "experience",
            f"experience_{index}",
            " | ".join(item.text.strip() for item in entry if item.text.strip()),
            [item.id for item in entry],
        )
        for index, entry in enumerate(entries, start=1)
    ]


def _structured_projects(elements: list[ParsedElement]) -> list[ExtractedProfileFact]:
    candidates = [
        element
        for element in elements
        if element.element_type == "list_item" and element.text.strip()
    ]
    if not candidates:
        candidates = [element for element in elements if element.text.strip()]
    return [
        _fact("project", f"project_{index}", element.text, [element.id])
        for index, element in enumerate(candidates, start=1)
    ]


def _structured_education(elements: list[ParsedElement]) -> list[ExtractedProfileFact]:
    facts: list[ExtractedProfileFact] = []
    index = 1
    for element in elements:
        text = " ".join(element.text.split())
        matches = list(_DATE_RANGE_RE.finditer(text))
        parts: list[str]
        if len(matches) > 1:
            parts = []
            start = 0
            for match in matches:
                parts.append(text[start : match.end()].strip())
                start = match.end()
            if text[start:].strip():
                parts[-1] = f"{parts[-1]} {text[start:].strip()}"
        else:
            parts = [text] if text else []
        for part in parts:
            facts.append(_fact("education", f"education_{index}", part, [element.id]))
            index += 1
    return facts


def plan_extraction(document: ParsedDocument) -> ExtractionPlan:
    header, sections = _segment(document)
    full_text = "\n".join(e.text for e in sorted(document.elements, key=lambda e: e.reading_order))
    plan = ExtractionPlan()
    plan.deterministic_facts.extend(_regex_contact_identity(header, full_text))
    plan.deterministic_facts.extend(_deterministic_sections(header, sections))
    plan.has_experience_section = bool(sections.get("experience"))
    for category in LLM_SECTIONS:
        els = sections.get(category)
        if els:
            text = "\n".join(e.text for e in els).strip()
            if text:
                plan.llm_sections.append((category, text))
    return plan


COMBINED_LLM_PROMPT = (
    "The text below contains one or more resume sections, each under a '### <SECTION>' header. "
    "Extract EVERY entry from EVERY section present — never skip a section or merge entries. Use these exact value formats:\n"
    "- EXPERIENCE: one fact per role, category 'experience', key experience_1, experience_2, …, value "
    "\"Company: <company>, Title: <title>, Dates: <start> - <end>, Location: <location>. Achievements: <bullet>. <bullet>.\"\n"
    "- EDUCATION: one fact per qualification (never combine two degrees), category 'education', key education_1, …, value \"<degree>, <institution>, <dates>\"\n"
    "- PROJECTS: one fact per project, category 'project', key project_1, …, value \"Name: <name>, Description: <description>\"\n"
    "Copy the resume's own wording. Omit a field only if truly absent. Plain text values only — never add bracketed markers."
)


def build_combined_input(llm_sections: list[tuple[str, str]]) -> str:
    return "\n\n".join(f"### {category.upper()}\n{text}" for category, text in llm_sections)


SECTION_LLM_PROMPTS: dict[str, str] = {
    "experience": (
        "The text below is the EXPERIENCE section of one resume. Extract EVERY distinct role — do not skip or merge any. "
        "Return one fact per role: category 'experience', key experience_1, experience_2, …, and value formatted exactly as "
        "\"Company: <company>, Title: <title>, Dates: <start> - <end>, Location: <location>. Achievements: <bullet>. <bullet>.\" "
        "Copy the resume's own wording for achievements. Omit a field only if it is truly absent. Plain text only — never add bracketed markers."
    ),
    "education": (
        "The text below is the EDUCATION section of one resume. Extract EVERY qualification as its own fact — never combine two degrees. "
        "Return category 'education', key education_1, education_2, …, value formatted exactly as \"<degree>, <institution>, <dates>\". Plain text only."
    ),
    "project": (
        "The text below is the PROJECTS section of one resume. Extract EVERY project as its own fact. "
        "Return category 'project', key project_1, project_2, …, value formatted exactly as \"Name: <name>, Description: <description>\". "
        "Copy the resume's own wording. Plain text only — never add bracketed markers."
    ),
}
