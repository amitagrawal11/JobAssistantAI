from __future__ import annotations

import html
import ipaddress
import re
import socket
from collections.abc import Callable
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

import httpx

from app.errors import DomainError
from app.models.job import JobUrlExtractResponse

MAX_JOB_PAGE_BYTES = 2_000_000
MIN_JOB_TEXT_LENGTH = 80


class _ReadableHtmlParser(HTMLParser):
    BLOCKED = {"script", "style", "svg", "noscript", "nav", "header", "footer", "form"}
    BREAKS = {"p", "div", "main", "article", "section", "h1", "h2", "h3", "li", "br"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.blocked_depth = 0
        self.parts: list[str] = []
        self.title_parts: list[str] = []
        self.in_title = False

    def handle_starttag(self, tag: str, _attrs) -> None:
        tag = tag.lower()
        if tag in self.BLOCKED:
            self.blocked_depth += 1
        if tag == "title":
            self.in_title = True
        if tag in self.BREAKS and not self.blocked_depth:
            self.parts.append("\n")
        if tag == "li" and not self.blocked_depth:
            self.parts.append("• ")

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in self.BLOCKED and self.blocked_depth:
            self.blocked_depth -= 1
        if tag == "title":
            self.in_title = False
        if tag in self.BREAKS and not self.blocked_depth:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)
        if not self.blocked_depth and not self.in_title:
            self.parts.append(data)


def _public_url(value: str) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise DomainError(status_code=422, code="UNSAFE_JOB_URL", message="Enter a public HTTP or HTTPS job URL.")
    if parsed.hostname.lower() == "localhost":
        raise DomainError(status_code=422, code="UNSAFE_JOB_URL", message="Local and private URLs are not allowed.")
    try:
        addresses = socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
    except socket.gaierror as error:
        raise DomainError(status_code=422, code="JOB_URL_UNREACHABLE", message="The job URL host could not be resolved.", retryable=True) from error
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise DomainError(status_code=422, code="UNSAFE_JOB_URL", message="Local and private URLs are not allowed.")
    return value.strip()


def _default_fetch(url: str) -> httpx.Response:
    with httpx.Client(
        follow_redirects=False,
        timeout=httpx.Timeout(12.0),
        headers={"User-Agent": "JobAssistantAI/0.1 (+local resume tailoring)"},
    ) as client:
        current = url
        for _redirect in range(4):
            response = client.get(current)
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    break
                current = _public_url(urljoin(current, location))
                continue
            response.raise_for_status()
            if len(response.content) > MAX_JOB_PAGE_BYTES:
                raise DomainError(status_code=422, code="JOB_URL_TOO_LARGE", message="The job page is too large to read safely.")
            return response
        raise DomainError(status_code=422, code="JOB_URL_UNREACHABLE", message="The job URL redirected too many times.")


class JobUrlExtractor:
    def __init__(self, fetch: Callable[[str], httpx.Response] = _default_fetch) -> None:
        self.fetch = fetch

    def extract(self, value: str) -> JobUrlExtractResponse:
        url = _public_url(value)
        try:
            response = self.fetch(url)
        except DomainError:
            raise
        except (httpx.HTTPError, TimeoutError) as error:
            raise DomainError(
                status_code=422, code="JOB_URL_UNREACHABLE",
                message="We could not read this job page. Paste the job description instead.", retryable=True,
            ) from error
        if "html" not in response.headers.get("content-type", "").lower():
            raise DomainError(status_code=422, code="JOB_URL_CONTENT_UNAVAILABLE", message="This URL is not a readable job page.")
        parser = _ReadableHtmlParser()
        parser.feed(response.text)
        lines = [re.sub(r"\s+", " ", html.unescape(line)).strip() for line in "".join(parser.parts).splitlines()]
        description = "\n".join(line for line in lines if line)
        if len(description) < MIN_JOB_TEXT_LENGTH:
            raise DomainError(
                status_code=422, code="JOB_URL_CONTENT_UNAVAILABLE",
                message="We could not find enough job-description text. Paste the description instead.",
            )
        page_title = re.sub(r"\s+", " ", "".join(parser.title_parts)).strip()
        title, company = self._split_title(page_title)
        return JobUrlExtractResponse(
            source_url=str(response.url) if response.url else url,
            title=title, company=company, description=description,
        )

    @staticmethod
    def _split_title(value: str) -> tuple[str | None, str | None]:
        for separator in (" | ", " - ", " at ", " @ "):
            if separator in value:
                first, second = value.split(separator, 1)
                return first.strip() or None, second.strip() or None
        return value or None, None
