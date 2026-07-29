from __future__ import annotations

import unittest

from app.ats.enrichment import enrich_job_description


class JobEnrichmentTests(unittest.TestCase):
    def test_extracts_explicit_requirements_with_source_evidence(self) -> None:
        source = """
        This role requires 3-5 years of experience and a Bachelor's degree or
        equivalent experience. We can sponsor a work visa. Salary is
        EUR 90,000-120,000 per year. Required skills: React, TypeScript, AWS.
        Fluency in English is required. This fintech role requires no travel.
        """
        result = enrich_job_description(source)
        self.assertEqual(result.max_experience, "three_to_five")
        self.assertEqual(result.degree_level, "equivalent_experience")
        self.assertEqual(result.sponsorship, "available")
        self.assertEqual((result.salary_min, result.salary_max, result.salary_currency), (90000, 120000, "EUR"))
        self.assertIn("React", result.skills)
        self.assertIn("English", result.languages)
        self.assertEqual(result.industry, "fintech")
        self.assertEqual(result.travel, "none")
        for evidence in result.evidence:
            self.assertIn(evidence["excerpt"], source)

    def test_unknowns_are_not_guessed(self) -> None:
        result = enrich_job_description("Join our friendly team and build useful products.")
        self.assertEqual(result.max_experience, "unknown")
        self.assertEqual(result.sponsorship, "unknown")
        self.assertIsNone(result.salary_min)
        self.assertEqual(result.evidence, [])


if __name__ == "__main__":
    unittest.main()
