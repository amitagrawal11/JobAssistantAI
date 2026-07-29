from __future__ import annotations

import unittest

from pydantic import ValidationError

from app.models.job_posting import CandidateJobStatePatch, JobPostingFilters


class CandidateJobFilterTests(unittest.TestCase):
    def test_candidate_filters_require_profile(self) -> None:
        with self.assertRaises(ValidationError):
            JobPostingFilters(match_levels=["strong"])

    def test_saved_and_dismissed_cannot_both_be_true(self) -> None:
        with self.assertRaises(ValidationError):
            CandidateJobStatePatch(saved=True, dismissed=True)

if __name__ == "__main__":
    unittest.main()
