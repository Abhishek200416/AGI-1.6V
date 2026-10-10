"""Unit test suite for interval_merger.py."""
import unittest
from interval_merger import merge_overlapping_intervals


class TestIntervalMerger(unittest.TestCase):
    def test_01_unsorted_overlapping_intervals(self) -> None:
        self.assertEqual(
            merge_overlapping_intervals([(8, 10), (1, 3), (2, 6), (15, 18)]),
            [(1, 6), (8, 10), (15, 18)],
        )

    def test_02_touching_boundary_intervals(self) -> None:
        # Closed intervals [1, 3] and [3, 5] touch at 3 and must merge into [1, 5]
        self.assertEqual(
            merge_overlapping_intervals([(1, 3), (3, 5), (7, 9)]),
            [(1, 5), (7, 9)],
        )

    def test_03_negative_and_nested_intervals(self) -> None:
        self.assertEqual(
            merge_overlapping_intervals([(-10, -2), (-6, -3), (-2, 4)]),
            [(-10, 4)],
        )

    def test_04_inverted_interval_raises_value_error(self) -> None:
        with self.assertRaises(ValueError):
            merge_overlapping_intervals([(1, 4), (6, 2)])


if __name__ == "__main__":
    unittest.main()
