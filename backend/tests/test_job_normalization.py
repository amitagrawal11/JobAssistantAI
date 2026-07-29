from __future__ import annotations

import unittest

from app.ats.normalization import (
    normalize_employment_type,
    normalize_experience_level,
    normalize_role_category,
    normalize_workplace_type,
)


class JobNormalizationTests(unittest.TestCase):
    def test_employment_type_uses_canonical_values(self) -> None:
        cases = {
            "FullTime": "full_time",
            "Full-time": "full_time",
            "part time": "part_time",
            "Contractor": "contract",
            "Intern": "internship",
            "Temporary": "temporary",
            None: "unknown",
        }
        for source, expected in cases.items():
            with self.subTest(source=source):
                self.assertEqual(normalize_employment_type(source), expected)

    def test_workplace_type_prefers_native_then_conservative_text(self) -> None:
        self.assertEqual(normalize_workplace_type("Remote", "London"), "remote")
        self.assertEqual(normalize_workplace_type("OnSite", "Remote"), "on_site")
        self.assertEqual(normalize_workplace_type(None, "Remote - Europe"), "remote")
        self.assertEqual(normalize_workplace_type(None, "Berlin (Hybrid)"), "hybrid")
        self.assertEqual(normalize_workplace_type(None, "Berlin"), "unknown")

    def test_role_category_uses_team_then_title(self) -> None:
        self.assertEqual(normalize_role_category("Senior Accountant", "Finance"), "finance")
        self.assertEqual(normalize_role_category("Staff Backend Engineer", None), "engineering")
        self.assertEqual(normalize_role_category("Product Designer", None), "design")
        self.assertEqual(normalize_role_category("Unusual Opportunity", None), "other")

    def test_experience_level_is_conservative(self) -> None:
        self.assertEqual(normalize_experience_level("Software Engineer Intern"), "internship")
        self.assertEqual(normalize_experience_level("Senior Engineer"), "senior")
        self.assertEqual(normalize_experience_level("Staff Engineer"), "lead_staff_principal")
        self.assertEqual(normalize_experience_level("Engineering Director"), "director")
        self.assertEqual(normalize_experience_level("Software Engineer"), "unknown")


if __name__ == "__main__":
    unittest.main()
