from __future__ import annotations

import httpx

from app.errors import DomainError


class LeverQuickApplyClient:
    """Submits an application through Lever's public posting apply form.

    Lever's hosted posting pages accept a multipart POST to ``{hosted_url}/apply``
    with the same fields their own apply form uses. Some boards gate this with a
    captcha, in which case Lever responds with a non-2xx status and the caller
    should fall back to the manual browser apply flow.
    """

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client or httpx.Client(timeout=20.0, follow_redirects=True)

    def submit(
        self,
        *,
        hosted_url: str,
        name: str,
        email: str,
        phone: str | None,
        comments: str | None,
        resume_filename: str,
        resume_media_type: str,
        resume_bytes: bytes,
    ) -> None:
        data = {"name": name, "email": email}
        if phone:
            data["phone"] = phone
        if comments:
            data["comments"] = comments
        files = {
            "resume": (resume_filename, resume_bytes, resume_media_type or "application/octet-stream"),
        }
        try:
            response = self._client.post(f"{hosted_url.rstrip('/')}/apply", data=data, files=files)
        except httpx.HTTPError as error:
            raise DomainError(
                status_code=502,
                code="QUICK_APPLY_UNREACHABLE",
                message="Could not reach Lever to submit the application.",
                retryable=True,
            ) from error
        if response.status_code >= 400:
            raise DomainError(
                status_code=422,
                code="QUICK_APPLY_REJECTED",
                message=(
                    "Lever rejected the automated application for this posting "
                    "(the board may require its hosted form). Use the Apply button "
                    "to submit it manually instead."
                ),
                details={"vendor_status": response.status_code},
            )
