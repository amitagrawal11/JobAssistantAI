from __future__ import annotations

import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from playwright.sync_api import sync_playwright

from app.models.tailoring import CanonicalResumeOutput


TEMPLATE_ROOT = Path(__file__).resolve().parents[2] / "templates"


def _filename_part(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._ -]+", "", value).strip()
    return re.sub(r"[\s._/-]+", "-", cleaned).strip("-") or "Resume"


def pdf_filename(name: str, company: str | None, title: str) -> str:
    parts = [_filename_part(name)]
    if company:
        parts.append(_filename_part(company))
    parts.append(_filename_part(title))
    return "_".join(parts) + ".pdf"


class TailoredResumePdfRenderer:
    def __init__(self) -> None:
        self.environment = Environment(
            loader=FileSystemLoader(TEMPLATE_ROOT),
            autoescape=select_autoescape(["html", "xml"]),
        )

    def render_html(self, resume: CanonicalResumeOutput, title: str, company: str | None) -> str:
        return self.environment.get_template("basic-a4-resume.html.j2").render(
            resume=resume.model_dump(mode="json"), title=title, company=company,
        )

    def render_pdf(self, resume: CanonicalResumeOutput, title: str, company: str | None) -> bytes:
        html = self.render_html(resume, title, company)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                page = browser.new_page()
                page.set_content(html, wait_until="networkidle")
                page.evaluate("document.fonts.ready")
                page.wait_for_selector('[data-render-ready="true"]')
                return page.pdf(
                    format="A4", print_background=True,
                    margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                    prefer_css_page_size=True,
                )
            finally:
                browser.close()
