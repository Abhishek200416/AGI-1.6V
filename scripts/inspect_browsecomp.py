import sys
import os
sys.path.insert(0, ".")
from agi.adapters.browsecomp_adapter import load_browsecomp_dataset

ds = load_browsecomp_dataset()
print(f"Total dataset size: {len(ds)} rows")
for i in range(6, 10):
    r = ds[i]
    print(f"--- Task {i+1} ---")
    print(f"Topic: {r['topic']}")
    print(f"Problem: {r['problem'][:120]}...")
    print(f"Answer: {repr(r['answer'])}")
