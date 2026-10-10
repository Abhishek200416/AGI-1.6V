"""Interval merger module (initial draft with boundary bug)."""
from typing import List, Tuple


def merge_overlapping_intervals(intervals: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    """Merges overlapping or touching closed intervals [start, end]."""
    if not intervals:
        return []

    for start, end in intervals:
        if start > end:
            raise ValueError("start > end")

    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged: List[Tuple[int, int]] = [sorted_intervals[0]]
    for current_start, current_end in sorted_intervals[1:]:
        last_start, last_end = merged[-1]
        if current_start <= last_end:
            merged[-1] = (last_start, max(last_end, current_end))
        else:
            merged.append((current_start, current_end))
    return merged
