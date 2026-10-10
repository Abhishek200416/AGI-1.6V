"""
agi/eval_memoryarena.py
Runs MemoryArena multi-session benchmark tasks using AGI 0.7 adapter.
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

from agi.adapters.memoryarena_adapter import load_memoryarena_dataset, run_memoryarena_session_task

def main():
    print("Loading MemoryArena dataset from Hugging Face...", flush=True)
    tasks = load_memoryarena_dataset(limit=2)
    print(f"Loaded {len(tasks)} multi-session task(s).", flush=True)
    
    results = []
    for t in tasks:
        res = run_memoryarena_session_task(t, agent_type="agi_0_7")
        results.append(res)
        time.sleep(2)
        
    out_path = os.path.abspath("agi/eval_results_memoryarena.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
        
    print(f"\nMemoryArena pilot evaluation complete! Saved to {out_path}", flush=True)
    for r in results:
        print(f"Task {r['task_id']}: Accuracy = {r['accuracy']*100:.1f}% ({r['correct_count']}/{r['total_sessions']})", flush=True)

if __name__ == "__main__":
    main()
