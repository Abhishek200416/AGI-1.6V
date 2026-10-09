"""
scripts/test_task4_real_browser.py
Test Task 4 with the upgraded Real WebBrowserEngine and multi-turn research loop.
"""

import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))
from agi.adapters.browsecomp_adapter import load_browsecomp_dataset, run_browsecomp_task

def main():
    ds = load_browsecomp_dataset()
    row = ds[3] # Task 4 (0-indexed 3)
    print("Evaluating Task 4 with Real WebBrowserEngine...")
    res = run_browsecomp_task(task_index=4, row=row, agent_type="agi_0_7")
    print("\nResult:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
