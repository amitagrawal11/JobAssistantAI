from __future__ import annotations

import re
from hashlib import sha256
from html import unescape

import bleach


def _text(value: str | None) -> str:
    return re.sub(r"[\s_-]+", " ", value or "").strip().lower()


def html_to_text(value: str | None) -> str | None:
    if not value:
        return None
    text = unescape(bleach.clean(value, tags=[], strip=True))
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def source_fingerprint(*values: str | None) -> str:
    normalized = "\x1f".join((value or "").strip() for value in values)
    return sha256(normalized.encode("utf-8")).hexdigest()


def normalize_employment_type(value: str | None) -> str:
    text = _text(value)
    if not text:
        return "unknown"
    if "intern" in text:
        return "internship"
    if "volunteer" in text:
        return "volunteer"
    if "part" in text and "time" in text:
        return "part_time"
    if "full" in text and "time" in text:
        return "full_time"
    if any(word in text for word in ("contract", "freelance", "consultant")):
        return "contract"
    if any(word in text for word in ("temporary", "fixed term", "seasonal")):
        return "temporary"
    return "other"


def normalize_workplace_type(native_value: str | None, location: str | None) -> str:
    native = _text(native_value)
    source = native or _text(location)
    if source in {"onsite", "on site"} or "on site" in source:
        return "on_site"
    if "hybrid" in source:
        return "hybrid"
    if any(word in source for word in ("remote", "work from home", "distributed")):
        return "remote"
    return "unknown"


_ROLE_PATTERNS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("security", ("security", "infosec", "cyber")),
    ("quality_testing", ("quality", " qa ", "test engineer", "sdet")),
    ("devops_infrastructure", ("devops", "infrastructure", "platform", "site reliability", "sre")),
    ("data", ("data", "analytics", "machine learning", "ml engineer", "ai engineer")),
    ("design", ("design", "ux", "ui/ux", "user experience")),
    ("product", ("product",)),
    ("engineering", ("engineer", "developer", "software", "frontend", "backend", "mobile")),
    ("customer_success", ("customer success", "customer support")),
    ("people_hr", ("people", "human resources", "recruit", "talent")),
    ("finance", ("finance", "account", "payroll", "treasury")),
    ("marketing", ("marketing", "content", "brand", "growth")),
    ("sales", ("sales", "account executive", "business development")),
    ("operations", ("operations", "supply chain", "procurement")),
)


def normalize_role_category(title: str, team: str | None) -> str:
    source = f" {_text(team)} {_text(title)} "
    for category, patterns in _ROLE_PATTERNS:
        if any(pattern in source for pattern in patterns):
            return category
    if any(word in source for word in ("manager", "director", "head", "chief", "vp ")):
        return "management"
    return "other"


def normalize_experience_level(title: str, native_value: str | None = None) -> str:
    source = f" {_text(native_value)} {_text(title)} "
    if any(word in source for word in ("intern", "apprentice", "graduate trainee")):
        return "internship"
    if any(word in source for word in ("chief", " cto ", " ceo ", " cfo ", "vice president", " vp ")):
        return "executive"
    if "director" in source or "head of" in source:
        return "director"
    if "manager" in source:
        return "manager"
    if any(word in source for word in ("principal", "staff", "tech lead", "technical lead", "lead ")):
        return "lead_staff_principal"
    if "senior" in source or " sr " in source:
        return "senior"
    if any(word in source for word in ("entry level", "junior", " jr ", "graduate ")):
        return "entry"
    if "associate" in source:
        return "associate"
    if "mid level" in source or "intermediate" in source:
        return "mid"
    return "unknown"
