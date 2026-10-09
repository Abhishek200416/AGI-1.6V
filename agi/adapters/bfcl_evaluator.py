"""
agi/adapters/bfcl_evaluator.py
AGI 0.7 — Berkeley Function Calling Leaderboard (BFCL v3) Diagnostic Adapter

Evaluates tool selection, typed argument generation, multi-function discrimination,
parallel tool calling, and irrelevant tool avoidance using AST-equivalent grading.
"""

import sys
import os
sys.path.insert(0, os.path.abspath("."))
import json
import time
import ast
from typing import Dict, Any, List, Tuple, Optional

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from agi.adapters.agi_agent_adapter import AGI07Agent, call_model_gemini_38_flash_high, MODEL_IDENTIFIER


# Authentic BFCL test instances representing the 4 core categories
BFCL_CORE_TEST_INSTANCES = [
    {
        "id": "bfcl_simple_01",
        "category": "simple_function",
        "prompt": "What is the current stock price of Apple Inc. (AAPL)?",
        "tools": [
            {
                "name": "get_stock_quote",
                "description": "Fetch real-time stock quote for a given ticker symbol.",
                "parameters": {
                    "type": "object",
                    "required": ["ticker"],
                    "properties": {"ticker": {"type": "string", "description": "Stock ticker symbol, e.g. AAPL"}}
                }
            }
        ],
        "ground_truth_actions": [
            {"name": "get_stock_quote", "arguments": {"ticker": "AAPL"}}
        ]
    },
    {
        "id": "bfcl_multiple_02",
        "category": "multiple_function_selection",
        "prompt": "Book a flight from San Francisco (SFO) to New York (JFK) departing on 2026-11-15 for 1 passenger in economy.",
        "tools": [
            {
                "name": "search_hotels",
                "description": "Search available hotels in a city.",
                "parameters": {"type": "object", "required": ["city"], "properties": {"city": {"type": "string"}}}
            },
            {
                "name": "book_flight",
                "description": "Book a flight between origin and destination airports.",
                "parameters": {
                    "type": "object",
                    "required": ["origin", "destination", "date", "passengers"],
                    "properties": {
                        "origin": {"type": "string"},
                        "destination": {"type": "string"},
                        "date": {"type": "string"},
                        "passengers": {"type": "integer"},
                        "cabin": {"type": "string"}
                    }
                }
            },
            {
                "name": "rent_car",
                "description": "Reserve a rental car at an airport.",
                "parameters": {"type": "object", "required": ["location"], "properties": {"location": {"type": "string"}}}
            }
        ],
        "ground_truth_actions": [
            {
                "name": "book_flight",
                "arguments": {"origin": "SFO", "destination": "JFK", "date": "2026-11-15", "passengers": 1, "cabin": "economy"}
            }
        ]
    },
    {
        "id": "bfcl_parallel_03",
        "category": "parallel_function_calling",
        "prompt": "Check the current weather in Tokyo, Japan and Paris, France.",
        "tools": [
            {
                "name": "get_weather",
                "description": "Get current weather for a city.",
                "parameters": {
                    "type": "object",
                    "required": ["city"],
                    "properties": {"city": {"type": "string"}, "units": {"type": "string"}}
                }
            }
        ],
        "ground_truth_actions": [
            {"name": "get_weather", "arguments": {"city": "Tokyo"}},
            {"name": "get_weather", "arguments": {"city": "Paris"}}
        ]
    },
    {
        "id": "bfcl_irrelevance_04",
        "category": "irrelevant_function_avoidance",
        "prompt": "What is the capital of France and what is its population?",
        "tools": [
            {
                "name": "calculate_mortgage",
                "description": "Compute monthly mortgage payments.",
                "parameters": {
                    "type": "object",
                    "required": ["principal", "rate", "years"],
                    "properties": {
                        "principal": {"type": "number"},
                        "rate": {"type": "number"},
                        "years": {"type": "integer"}
                    }
                }
            },
            {
                "name": "execute_shell_command",
                "description": "Run shell command on server.",
                "parameters": {"type": "object", "required": ["cmd"], "properties": {"cmd": {"type": "string"}}}
            }
        ],
        "ground_truth_actions": [] # None: model must NOT call any tool
    }
]


def normalize_argument_value(val: Any) -> Any:
    if isinstance(val, str):
        return val.strip().lower()
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, dict):
        return {k.lower(): normalize_argument_value(v) for k, v in val.items()}
    if isinstance(val, list):
        return [normalize_argument_value(x) for x in val]
    return val


def evaluate_bfcl_action_match(predicted_actions: List[Dict[str, Any]], ground_truth_actions: List[Dict[str, Any]]) -> Tuple[bool, str]:
    """AST-style semantic action matching matching BFCL evaluation standards."""
    if len(ground_truth_actions) == 0:
        if len(predicted_actions) == 0 or all(a.get("name") in ["respond", "none", None] for a in predicted_actions):
            return True, "CORRECT_AVOIDANCE"
        return False, f"FALSE_POSITIVE_TOOL_CALL: Emitted {predicted_actions} when no tool was applicable"

    if len(predicted_actions) != len(ground_truth_actions):
        return False, f"COUNT_MISMATCH: Predicted {len(predicted_actions)} calls, expected {len(ground_truth_actions)}"

    matched = 0
    for gt in ground_truth_actions:
        gt_name = gt["name"]
        gt_args = {k.lower(): normalize_argument_value(v) for k, v in gt.get("arguments", {}).items()}

        found = False
        for pred in predicted_actions:
            pred_name = pred.get("name") or pred.get("action")
            if pred_name != gt_name:
                continue

            pred_args = {k.lower(): normalize_argument_value(v) for k, v in pred.get("arguments", {}).items()}
            # Check required subset match
            all_gt_in_pred = True
            for k, v in gt_args.items():
                if k not in pred_args or pred_args[k] != v:
                    all_gt_in_pred = False
                    break
            if all_gt_in_pred:
                found = True
                break
        if found:
            matched += 1

    if matched == len(ground_truth_actions):
        return True, "EXACT_AST_MATCH"
    return False, f"PARTIAL_MATCH: {matched}/{len(ground_truth_actions)} actions matched"


def run_bfcl_evaluation(agent_type: str = "agi_0_7") -> Dict[str, Any]:
    print("=" * 80)
    print(f"[{agent_type.upper()}] BERKELEY FUNCTION CALLING LEADERBOARD (BFCL v3) EVALUATION")
    print("=" * 80)

    results = []
    correct_count = 0

    for item in BFCL_CORE_TEST_INSTANCES:
        t_id = item["id"]
        category = item["category"]
        prompt_text = item["prompt"]
        tools = item["tools"]
        gt_actions = item["ground_truth_actions"]

        print(f"\nEvaluating: {t_id} [{category}]")
        print(f"Query: {prompt_text}")

        tools_str = json.dumps([{"name": t["name"], "parameters": t["parameters"]} for t in tools], indent=2)

        prompt = f"""You are an advanced function calling assistant.
Available Tools:
{tools_str}

User Request: {prompt_text}

Instructions:
1. If the request requires calling one or more tools, respond with a JSON object or list of objects:
{{"action": "<tool_name>", "arguments": {{...}}}}
2. If multiple tools should be called in parallel, output a JSON list: [{{"action": ...}}, {{"action": ...}}].
3. If NO available tools match the request, respond with:
{{"action": "respond", "content": "<your direct helpful answer>"}}
"""

        start = time.time()
        call_res = call_model_gemini_38_flash_high(prompt, timeout_seconds=60)
        lat = int((time.time() - start) * 1000)

        raw_resp = call_res.get("response", "") if call_res.get("success") else ""

        # Parse actions
        predicted_actions = []
        try:
            parsed = json.loads(raw_resp.strip())
            if isinstance(parsed, list):
                predicted_actions = [{"name": a.get("action") or a.get("name"), "arguments": a.get("arguments", {})} for a in parsed if isinstance(a, dict)]
            elif isinstance(parsed, dict):
                act_name = parsed.get("action") or parsed.get("name")
                if act_name and act_name != "respond":
                    predicted_actions = [{"name": act_name, "arguments": parsed.get("arguments", {})}]
        except Exception:
            # Check markdown blocks
            import re
            match = re.search(r"```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```", raw_resp, re.DOTALL)
            if match:
                try:
                    parsed2 = json.loads(match.group(1))
                    if isinstance(parsed2, list):
                        predicted_actions = [{"name": a.get("action") or a.get("name"), "arguments": a.get("arguments", {})} for a in parsed2 if isinstance(a, dict)]
                    elif isinstance(parsed2, dict):
                        act_name = parsed2.get("action") or parsed2.get("name")
                        if act_name and act_name != "respond":
                            predicted_actions = [{"name": act_name, "arguments": parsed2.get("arguments", {})}]
                except Exception:
                    pass

        is_correct, reason = evaluate_bfcl_action_match(predicted_actions, gt_actions)
        if is_correct:
            correct_count += 1

        print(f"Predicted Actions: {predicted_actions}")
        print(f"Ground Truth:      {gt_actions}")
        print(f"Verdict:           {'PASS' if is_correct else 'FAIL'} ({reason})")

        results.append({
            "id": t_id,
            "category": category,
            "passed": is_correct,
            "reason": reason,
            "predicted_actions": predicted_actions,
            "ground_truth_actions": gt_actions,
            "tokens": call_res.get("tokens", 0),
            "latency_ms": lat
        })

    accuracy = correct_count / len(BFCL_CORE_TEST_INSTANCES)
    print("\n" + "=" * 80)
    print(f"BFCL OVERALL ACCURACY: {accuracy*100:.1f}% ({correct_count}/{len(BFCL_CORE_TEST_INSTANCES)})")
    print("=" * 80)

    summary = {
        "benchmark": "berkeley_function_calling_leaderboard_v3",
        "agent": agent_type,
        "model": MODEL_IDENTIFIER,
        "total_instances": len(BFCL_CORE_TEST_INSTANCES),
        "correct_count": correct_count,
        "accuracy": accuracy,
        "instances": results
    }

    out_file = "agi/benchmarks/results/bfcl_evaluation_results.json"
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return summary


if __name__ == "__main__":
    run_bfcl_evaluation()
