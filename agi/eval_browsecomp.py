"""
agi/eval_browsecomp.py
Runs representative OpenAI simple-evals BrowseComp benchmark tasks using AGI 0.7 adapter.
"""

import os
import sys
import json
import time

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

sys.path.insert(0, os.path.abspath("."))

from agi.adapters.browsecomp_adapter import load_browsecomp_dataset, run_browsecomp_task

def main():
    print("Loading BrowseComp dataset...", flush=True)
    rows = load_browsecomp_dataset()
    print(f"Total rows loaded: {len(rows)}", flush=True)
    
    # Run a pilot of 3 representative tasks across domains
    pilot_indices = [0, 1, 2]
    results = []
    
    for idx in pilot_indices:
        r = rows[idx]
        res = run_browsecomp_task(task_index=idx, row=r, agent_type="agi_0_7")
        results.append(res)
        time.sleep(2) # Throttle to respect quota
        
    out_path = os.path.abspath("agi/eval_results_browsecomp.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print(f"\nBrowseComp pilot evaluation complete! Saved to {out_path}", flush=True)
    total_correct = sum(1 for r in results if r["is_correct"])
    print(f"Score: {total_correct}/{len(results)} ({total_correct/len(results)*100:.1f}%)", flush=True)

if __name__ == "__main__":
    main()
