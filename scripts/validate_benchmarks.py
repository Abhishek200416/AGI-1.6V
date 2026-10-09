#!/usr/bin/env python3
"""
scripts/validate_benchmarks.py
CLI wrapper for the AGI 0.7 Benchmark Results Validator & Report Generator.
"""

import sys
import os

# Ensure repo root is on sys.path
sys.path.insert(0, os.path.abspath("."))

from agi.benchmarks.validator import main

if __name__ == "__main__":
    main()
