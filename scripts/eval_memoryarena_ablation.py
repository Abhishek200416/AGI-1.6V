"""
scripts/eval_memoryarena_ablation.py
Executes MemoryArena multi-session shopping evaluation across 3 ablation conditions:
1. 10-Tier Durable Memory
2. Stateless Baseline
3. Windowed Memory (Window = 2 sessions)
"""

import sys
import os
import json

sys.path.insert(0, os.path.abspath("."))
from agi.adapters.memoryarena_adapter import (
    MockWebShopCatalog,
    run_memoryarena_session_task,
    MOCK_WEBSHOP_PRODUCTS
)

# 12 interdependent sessions evaluating preference retention and catalog grounding
BENCHMARK_12_SESSIONS_TASK = {
    "id": "memoryarena_shopping_eval_12",
    "questions": [
        "I am looking for organic Ethiopian whole bean coffee with a dark roast and citrus/floral notes. What product ASIN matches?",
        "Please confirm the price and details of the coffee recommended in the previous session.",
        "Now I need stainless steel pour-over coffee dripper equipment with a reusable mesh filter to brew that coffee. What ASIN?",
        "Can you verify the filter type and capacity of the pour-over dripper we just discussed?",
        "I work long hours at my desk and suffer from lower back pain. Please find an ergonomic memory foam lumbar support pillow for my office chair. What ASIN?",
        "Verify if that lumbar pillow uses breathable 3D mesh.",
        "I also need a contoured high-density seat cushion for my office chair with a coccyx cutout. What ASIN?",
        "Confirm if that seat cushion has a non-slip base.",
        "Recall the coffee we selected in Session 1. Based on my interest in gourmet cooking, recommend a heavy-duty enameled cast iron Dutch oven (6-quart cherry red) for slow braising. What ASIN?",
        "Confirm the oven-safe temperature limit of the Dutch oven.",
        "For my bedroom, I want a 100% organic bamboo fiber king size sheet set that provides breathable cooling. What ASIN matches?",
        "Does that sheet set come as a 4-piece set?"
    ],
    "answers": [
        "B07T48N6MN",
        "B07T48N6MN",
        "B01M0A5KL8",
        "B01M0A5KL8",
        "B09K827F33",
        "B09K827F33",
        "B07L2P118G",
        "B07L2P118G",
        "B09C3X9Z88",
        "B09C3X9Z88",
        "B08XJ8P34N",
        "B08XJ8P34N"
    ]
}

def main():
    print("=" * 80)
    print("AGI 0.7 MEMORYARENA ABLATION EVALUATION (12 SESSIONS)")
    print("=" * 80)

    conditions = ["10-tier", "stateless", "windowed"]
    ablation_results = {}

    for mode in conditions:
        print(f"\n>>> EVALUATING CONDITION: {mode.upper()} <<<")
        res = run_memoryarena_session_task(
            task_data=BENCHMARK_12_SESSIONS_TASK,
            agent_type="agi_0_7",
            memory_mode=mode
        )
        ablation_results[mode] = res

    # Summary table
    print("\n" + "=" * 90)
    print("MEMORYARENA ABLATION SUMMARY TABLE (12 SESSIONS)")
    print("=" * 90)
    print(f"{'Condition':<20} | {'Correct':<10} | {'Accuracy':<12} | {'Tokens':<12} | {'Latency (s)':<15}")
    print("-" * 90)
    for mode, r in ablation_results.items():
        acc_str = f"{r['accuracy']*100:.1f}%"
        lat_sec = f"{r['latency_ms']/1000:.1f}s"
        print(f"{mode.upper():<20} | {r['correct_count']}/12{'':<6} | {acc_str:<12} | {r['tokens']:<12} | {lat_sec:<15}")
    print("=" * 90)

    out_file = "agi/data/memoryarena_ablation_evaluation_results.json"
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(ablation_results, f, indent=2)
    print(f"Results recorded in: {out_file}")

if __name__ == "__main__":
    main()
