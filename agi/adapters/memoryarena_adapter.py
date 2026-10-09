"""
agi/adapters/memoryarena_adapter.py
AGI 0.7 — MemoryArena Official Benchmark Adapter

Evaluates agent memory in interdependent multi-session agentic tasks.
Tests whether accumulated memory across sessions guides downstream decision making.
"""

import os
import sys
import json
import time
import urllib.request
from typing import Dict, Any, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from agi.adapters.agi_agent_adapter import AGI07Agent, MODEL_IDENTIFIER

MEMORYARENA_URL = "https://huggingface.co/datasets/ZexueHe/memoryarena/raw/main/bundled_shopping/data.jsonl"

def load_memoryarena_dataset(limit: int = 10) -> List[Dict[str, Any]]:
    req = urllib.request.Request(MEMORYARENA_URL, headers={"User-Agent": "Mozilla/5.0"})
    tasks = []
    with urllib.request.urlopen(req) as resp:
        for line in resp:
            line_str = line.decode("utf-8").strip()
            if not line_str:
                continue
            tasks.append(json.loads(line_str))
            if len(tasks) >= limit:
                break
    return tasks

def run_memoryarena_session_task(task_data: Dict[str, Any], agent_type: str = "agi_0_7") -> Dict[str, Any]:
    task_id = task_data.get("id", "task-0")
    questions = task_data.get("questions", [])
    answers = task_data.get("answers", [])
    
    print(f"\n=======================================================", flush=True)
    print(f"[{agent_type.upper()}] RUNNING MEMORYARENA TASK: {task_id}", flush=True)
    print(f"Interdependent Subtask Count: {len(questions)} sessions", flush=True)
    print(f"=======================================================", flush=True)
    
    agent = AGI07Agent(task_name=f"memoryarena_{task_id}")
    
    session_results = []
    correct_count = 0
    
    for sess_idx, (q, ground_truth) in enumerate(zip(questions, answers), start=1):
        print(f"\n--- SESSION {sess_idx}/{len(questions)} ---", flush=True)
        print(f"Prompt: {q[:140]}...", flush=True)
        print(f"Target Answer: {ground_truth}", flush=True)
        
        parsed_action, call_res = agent.step(q)
        
        response_text = call_res.get("response", "") if call_res.get("success") else ""
        thought = parsed_action.get("thought", "") if parsed_action else ""
        
        # Check if response matches target
        resp_clean = response_text.lower()
        gt_clean = str(ground_truth).lower()
        
        matched = gt_clean in resp_clean or (parsed_action and gt_clean in str(parsed_action.get("arguments", {})).lower())
        if matched:
            correct_count += 1
            
        print(f"Response: {response_text[:120]}...", flush=True)
        print(f"Session {sess_idx} Verdict: {'MATCH' if matched else 'MISS'}", flush=True)
        
        # In AGI 0.7, persist intermediate knowledge into semantic/episodic memory tiers
        agent.memory.remember("semantic", f"session_{sess_idx}_facts", {
            "query": q[:100],
            "response": response_text[:200],
            "session": sess_idx
        }, importance=8)
        
        session_results.append({
            "session": sess_idx,
            "matched": matched,
            "latency_ms": call_res.get("latency_ms", 0),
            "tokens": call_res.get("tokens", 0)
        })
        
    accuracy = correct_count / max(1, len(questions))
    agent.finish(success=accuracy >= 0.5, final_evidence={
        "accuracy": accuracy,
        "correct_count": correct_count,
        "total_sessions": len(questions)
    })
    
    print(f"\n=======================================================", flush=True)
    print(f"TASK {task_id} OVERALL ACCURACY: {accuracy*100:.1f}% ({correct_count}/{len(questions)})", flush=True)
    print(f"Total Tokens: {agent.total_tokens} (Thinking: {agent.thinking_tokens})", flush=True)
    print(f"Total Latency: {agent.total_latency_ms}ms", flush=True)
    print(f"=======================================================\n", flush=True)
    
    return {
        "task_id": task_id,
        "agent": agent_type,
        "total_sessions": len(questions),
        "correct_count": correct_count,
        "accuracy": accuracy,
        "tokens": agent.total_tokens,
        "thinking_tokens": agent.thinking_tokens,
        "latency_ms": agent.total_latency_ms,
        "sessions": session_results
    }
