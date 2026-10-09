"""
tests/test_browsecomp_repair.py
Verification suite for AGI 0.7 BrowseComp pipeline repairs and canonicalization.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.abspath("."))
from agi.adapters.browsecomp_adapter import (
    canonicalize_answer,
    normalize_date_range,
    is_semantically_equivalent,
    decompose_constraints,
    CONTAMINATED_TASK_INDICES
)


class TestBrowseCompRepair(unittest.TestCase):

    def test_unicode_and_dash_normalization(self):
        # En-dash (\u2013)
        self.assertEqual(canonicalize_answer("1988\u20131996"), "1988-1996")
        # Em-dash (\u2014)
        self.assertEqual(canonicalize_answer("1988\u20141996"), "1988-1996")
        # Mathematical minus (\u2212)
        self.assertEqual(canonicalize_answer("1988\u22121996"), "1988-1996")
        # Whitespace around hyphen
        self.assertEqual(canonicalize_answer("1988 - 1996"), "1988-1996")

    def test_tag_and_markdown_stripping(self):
        self.assertEqual(canonicalize_answer("<final_answer>1988-96</final_answer>"), "1988-96")
        self.assertEqual(canonicalize_answer("**1988-96**"), "1988-96")
        self.assertEqual(canonicalize_answer("`1988-96`"), "1988-96")
        self.assertEqual(canonicalize_answer('"1988-96."'), "1988-96")
        self.assertEqual(canonicalize_answer("[1988-96]"), "1988-96")

    def test_article_and_punctuation_normalization(self):
        self.assertEqual(canonicalize_answer("The United States of America."), "united states of america")
        self.assertEqual(canonicalize_answer("A Golden Retriever,"), "golden retriever")
        self.assertEqual(canonicalize_answer("An Apple;"), "apple")

    def test_number_and_unit_normalization(self):
        self.assertEqual(canonicalize_answer("1,000,000"), "1000000")
        self.assertEqual(canonicalize_answer("2,500 km"), "2500 km")

    def test_date_range_equivalence(self):
        # The exact historical FAIL-BC-001 case
        pred = "1988\u20131996"
        gt = "1988-96"
        official, canon, diag = is_semantically_equivalent(pred, gt)
        
        self.assertFalse(official, "Official raw match must be False preserving uncompromised grader baseline")
        self.assertTrue(canon, "Canonicalized match must be True under certified equivalence")
        self.assertEqual(diag["matched_rule"], "DATE_RANGE_EQUIVALENCE")

    def test_sports_opponent_normalization(self):
        # Task 2 historical fixture case
        pred = "Ireland vs Romania"
        gt = "Ireland v Romania"
        official, canon, diag = is_semantically_equivalent(pred, gt)
        self.assertTrue(canon)
        self.assertEqual(diag["canon_predicted"], "ireland v romania")
        self.assertEqual(diag["canon_ground_truth"], "ireland v romania")

    def test_rejection_of_false_answers(self):
        pred = "1990-2000"
        gt = "1988-96"
        official, canon, diag = is_semantically_equivalent(pred, gt)
        self.assertFalse(official)
        self.assertFalse(canon)
        self.assertEqual(diag["matched_rule"], "NONE")

    def test_constraint_decomposition(self):
        complex_query = (
            "Between 1990 and 1994, find what teams played in a soccer match with a Brazilian referee. "
            "The match had four yellow cards and two red cards."
        )
        subqueries = decompose_constraints(complex_query, max_subqueries=3)
        self.assertGreaterEqual(len(subqueries), 2)
        self.assertTrue(all(len(sq) > 10 for sq in subqueries))

    def test_contamination_quarantine(self):
        self.assertIn(1, CONTAMINATED_TASK_INDICES)
        self.assertIn(2, CONTAMINATED_TASK_INDICES)
        self.assertNotIn(3, CONTAMINATED_TASK_INDICES)
        self.assertNotIn(4, CONTAMINATED_TASK_INDICES)


if __name__ == "__main__":
    unittest.main()
