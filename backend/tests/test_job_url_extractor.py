from __future__ import annotations

import httpx
import pytest

from app.errors import DomainError
from app.jobs.url_extractor import JobUrlExtractor


def response(html: str, *, url: str = "https://jobs.example.com/role") -> httpx.Response:
    request = httpx.Request("GET", url)
    return httpx.Response(200, text=html, request=request, headers={"content-type": "text/html"})


def test_rejects_loopback_and_private_hosts() -> None:
    extractor = JobUrlExtractor(fetch=lambda _url: response(""))

    for url in ("http://127.0.0.1/job", "http://localhost/job", "http://10.0.0.5/job"):
        with pytest.raises(DomainError) as error:
            extractor.extract(url)
        assert error.value.code == "UNSAFE_JOB_URL"


def test_extracts_readable_job_content_and_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.jobs.url_extractor.socket.getaddrinfo", lambda *_args: [
        (2, 1, 6, "", ("93.184.216.34", 443)),
    ])
    html = """
    <html><head><title>Senior Engineer | Acme</title></head><body>
      <nav>Navigation</nav>
      <main>
        <h1>Senior Frontend Engineer</h1>
        <p>Acme builds useful software for teams around the world.</p>
        <h2>Responsibilities</h2>
        <ul><li>Lead React and TypeScript architecture.</li><li>Mentor engineers.</li></ul>
      </main>
      <script>ignore()</script>
    </body></html>
    """

    result = JobUrlExtractor(fetch=lambda _url: response(html)).extract("https://jobs.example.com/role")

    assert result.title == "Senior Engineer"
    assert result.company == "Acme"
    assert "Senior Frontend Engineer" in result.description
    assert "Lead React and TypeScript architecture." in result.description
    assert "Navigation" not in result.description
    assert "ignore" not in result.description
    assert result.source_url == "https://jobs.example.com/role"


def test_rejects_pages_without_enough_readable_content(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.jobs.url_extractor.socket.getaddrinfo", lambda *_args: [
        (2, 1, 6, "", ("93.184.216.34", 443)),
    ])

    with pytest.raises(DomainError) as error:
        JobUrlExtractor(fetch=lambda _url: response("<html><body>Sign in</body></html>")).extract(
            "https://jobs.example.com/role"
        )

    assert error.value.code == "JOB_URL_CONTENT_UNAVAILABLE"
