from __future__ import annotations

import unittest
from app.ats.query_service import JobPostingQueryService
from app.models.job_posting import JobPostingFilters, JobPostingSort


class JobPostingFilterContractTests(unittest.TestCase):
    def test_unknown_and_blank_facet_values_are_not_selectable(self) -> None:
        for value in (None, "", "  ", "unknown", "UNKNOWN", " Unknown "):
            self.assertFalse(JobPostingQueryService._is_selectable(value))
        self.assertTrue(JobPostingQueryService._is_selectable("remote"))

    def test_filter_contract_covers_structured_enriched_and_candidate_values(self) -> None:
        filters = JobPostingFilters(
            include=["react", '"design systems"'],
            exclude=["wordpress"],
            locations=["Amsterdam"],
            workplace_types=["remote"],
            sponsorship=["available"],
            skills=["React"],
            profile_id="00000000-0000-0000-0000-000000000001",
            match_levels=["strong"],
            hide_applied=True,
            sort=JobPostingSort.best_match,
        )
        self.assertEqual(filters.include, ["react", '"design systems"'])
        self.assertEqual(filters.sort, JobPostingSort.best_match)
        self.assertTrue(filters.uses_candidate_filters)

    def test_candidate_filter_detection_ignores_normal_filters(self) -> None:
        self.assertFalse(JobPostingFilters(companies=["Figma"]).uses_candidate_filters)

    def test_retired_filters_are_not_part_of_public_contract(self) -> None:
        retired = {
            "posted_after", "posted_before", "minimum_match_score", "missing_skills",
            "salary_min", "salary_max", "salary_currency", "degree_levels",
            "max_experience", "industries", "travel",
        }
        self.assertTrue(retired.isdisjoint(JobPostingFilters.model_fields))


if __name__ == "__main__":
    unittest.main()
