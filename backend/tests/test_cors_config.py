from __future__ import annotations

import re
import unittest

from app.config import Settings


class CorsConfigTests(unittest.TestCase):
    def test_local_development_hosts_are_allowed(self) -> None:
        settings = Settings(
            database_url="postgresql+psycopg://example",
            storage_root="/tmp/job-assistant-tests",
            development_bearer_token="test-token",
        )

        self.assertIsNotNone(
            re.fullmatch(settings.extension_origin_regex, "http://localhost:5173")
        )
        self.assertIsNotNone(
            re.fullmatch(settings.extension_origin_regex, "http://127.0.0.1:5173")
        )
        self.assertIsNone(
            re.fullmatch(settings.extension_origin_regex, "https://example.com")
        )


if __name__ == "__main__":
    unittest.main()
