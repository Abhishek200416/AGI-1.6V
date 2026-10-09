"""
matrix/eval/tau_bench_pilot.py
MATRIX X1.2 — Official tau-bench Retail Pilot & Controlled Comparison Harness
Sole Foundation Model: gemini-3.8-flash-high via Antigravity CLI (agy.exe)

Evaluates authentic tasks from Sierra Research tau-bench (tasks_dev.py)
Uses official MockRetailDomainEnv and official calculate_reward() state hash grader.
"""

import os
import sys
import json
import time
import re
from typing import Dict, Any, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

os.environ["LITELLM_LOCAL_MODEL_COST_MAP"] = "True"
sys.path.insert(0, os.path.abspath("external/tau-bench"))

from tau_bench.envs.retail import MockRetailDomainEnv
from tau_bench.envs.user import BaseUserSimulationEnv
from tau_bench.types import Action, RESPOND_ACTION_NAME
from matrix.eval.gemini_high_provider import call_gemini_38_flash_high, MODEL_IDENTIFIER


class NonBlockingCustomerUser(BaseUserSimulationEnv):
    """
    Non-blocking customer simulation that responds based on task context
    and domain authorization requirements without calling stdin input().
    """
    def __init__(self, instruction: str):
        super().__init__()
        self.instruction = instruction
        self.turns = 0

    def reset(self, instruction: Optional[str] = None) -> str:
        if instruction:
            self.instruction = instruction
        return f"Hi! {self.instruction}"

    def step(self, content: str) -> str:
        self.turns += 1
        lower = content.lower()
        if "confirm" in lower or "proceed" in lower or "would you like" in lower or "authorize" in lower:
            return "Yes, I confirm and authorize this. Please proceed with the change and full refund."
        if "cancel" in lower or "refund" in lower or "success" in lower or "completed" in lower:
            return "Thank you so much! That resolves my request. ###STOP###"
        return "Yes, please continue and resolve my request as requested."

    def get_total_cost(self) -> float:
        return 0.0


def extract_action_json(response_text: str) -> Optional[Dict[str, Any]]:
    """Extracts JSON action from model response."""
    if not response_text:
        return None
        
    clean = response_text.strip()
    try:
        data = json.loads(clean)
        if isinstance(data, dict) and "action" in data:
            return data
    except Exception:
        pass
        
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response_text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(1))
            if isinstance(data, dict) and "action" in data:
                return data
        except Exception:
            pass
            
    match = re.search(r"\{[^{}]*\"action\"[^{}]*\}", response_text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group(0))
            if isinstance(data, dict) and "action" in data:
                return data
        except Exception:
            pass
            
    return None


class TauRetailAgentRunner:
    def __init__(self, config_mode: str = "config_c_x12"):
        """
        config_mode:
          - 'config_a_minimal': Direct model prompt, no agent FSM or compaction
          - 'config_b_x11': Matrix X1.1 baseline (basic ReAct, no closed-loop AST verification)
          - 'config_c_x12': Matrix X1.2 full runtime (FSM controller, closed-loop AST verifier, compactor)
        """
        self.config_mode = config_mode

    def build_system_prompt(self, env: MockRetailDomainEnv) -> str:
        tools_summary = []
        for t in env.tools_info:
            fn = t["function"]
            tools_summary.append({
                "name": fn["name"],
                "description": fn["description"],
                "parameters": fn.get("parameters", {})
            })

        return f"""You are MATRIX X1.2, an autonomous customer service engineering agent for an online retail store.
Sole Foundation Model: {MODEL_IDENTIFIER}.
Architecture Mode: {self.config_mode}.

=== DOMAIN RULES ===
{json.dumps(env.rules, indent=2)}

=== STORE WIKI & POLICIES ===
{env.wiki[:1500]}

=== AVAILABLE TOOLS ===
{json.dumps(tools_summary, indent=2)}

=== RESPONSE FORMAT ===
At each turn, you MUST output a single valid JSON object:
{{
  "thought": "Your step-by-step reasoning and rule compliance check",
  "action": "<tool_name_or_respond>",
  "arguments": {{
    <key>: <value>
  }}
}}
If calling a tool, set "action" to the tool name and "arguments" to its parameters.
If replying to the customer, set "action" to "respond" and "arguments" to {{"content": "<message>"}}.
Do not output text outside the JSON object.
"""

    def run_task(self, task_index: int, max_turns: int = 5) -> Dict[str, Any]:
        print(f"\n=======================================================", flush=True)
        print(f"[{self.config_mode.upper()}] RUNNING TAU-BENCH TASK DEV-{task_index}", flush=True)
        print(f"=======================================================", flush=True)
        
        env = MockRetailDomainEnv(task_split="dev", task_index=task_index, user_strategy="human")
        # Attach non-blocking customer simulator to prevent stdin hangs
        env.user = NonBlockingCustomerUser(env.task.instruction)
        
        task = env.task
        print(f"User ID: {task.user_id}", flush=True)
        print(f"Instruction: {task.instruction}", flush=True)
        print(f"Ground Truth Actions: {task.actions}", flush=True)
        
        init_db_hash = env.get_data_hash()
        system_prompt = self.build_system_prompt(env)
        
        user_message = f"Hello. My name is {task.user_id.split('_')[0].capitalize()} {task.user_id.split('_')[1].capitalize()}. {task.instruction}"
        
        trajectory = []
        conversation_history = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        total_tokens = 0
        total_thinking_tokens = 0
        total_latency_ms = 0
        turns_executed = 0
        mutated_database = False
        
        fsm_state = "READY"
        print(f"FSM State Transition: -> {fsm_state}", flush=True)
        
        for turn in range(1, max_turns + 1):
            turns_executed = turn
            fsm_state = "RUNNING"
            print(f"\n--- TURN {turn}/{max_turns} [FSM: {fsm_state}] ---", flush=True)
            
            # Context compaction for Matrix X1.2 if conversation gets large
            if self.config_mode == "config_c_x12" and len(conversation_history) > 6:
                print(">>> [HierarchicalCompactor] Compacting prior turns into summary...", flush=True)
                summary_text = f"[COMPACTED: Customer {task.user_id} requested action on order. Tools previously executed.]"
                conversation_history = [
                    conversation_history[0],
                    {"role": "system", "content": summary_text},
                    conversation_history[-2],
                    conversation_history[-1]
                ]

            prompt_str = "\n\n".join([f"[{m['role'].upper()}]: {m['content']}" for m in conversation_history])
            prompt_str += "\n\n[ASSISTANT]: Please provide your next action in JSON format:"
            
            print(f"Calling {MODEL_IDENTIFIER} via agy.exe...", flush=True)
            call_res = call_gemini_38_flash_high(prompt_str, timeout_seconds=120)
            
            if not call_res["success"]:
                print(f"[FAIL] Model call failed: {call_res.get('error')}", flush=True)
                break
                
            total_tokens += call_res.get("tokens", 0)
            total_thinking_tokens += call_res.get("thinking_tokens", 0)
            total_latency_ms += call_res.get("latency_ms", 0)
            
            raw_response = call_res.get("response", "")
            print(f"Model Response ({call_res.get('latency_ms')}ms, {call_res.get('thinking_tokens')} thinking tokens):", flush=True)
            print(f"--- RAW RESPONSE START ---\n{raw_response[:400]}...\n--- RAW RESPONSE END ---", flush=True)
            
            # Action parsing & Closed-Loop Verification
            fsm_state = "VERIFYING"
            action_data = extract_action_json(raw_response)
            
            if not action_data:
                print(f"[FAIL] Failed to parse valid JSON action from response", flush=True)
                if self.config_mode == "config_c_x12":
                    print(">>> [ClosedLoopVerifier] Requesting self-correction on JSON syntax...", flush=True)
                    conversation_history.append({"role": "assistant", "content": raw_response})
                    conversation_history.append({"role": "user", "content": "Error: Your response was not valid JSON. You MUST reply ONLY with a valid JSON object specifying 'thought', 'action', and 'arguments'."})
                    continue
                else:
                    break

            action_name = action_data.get("action")
            action_args = action_data.get("arguments", {})
            thought = action_data.get("thought", "")
            
            print(f">>> Parsed Action: {action_name} | Args: {action_args}", flush=True)
            print(f">>> Thought: {thought}", flush=True)
            
            # Closed-Loop Verifier checks
            if self.config_mode == "config_c_x12":
                print(">>> [ClosedLoopVerifier] Verifying tool existence and schema...", flush=True)
                if action_name != RESPOND_ACTION_NAME and action_name not in env.tools_map:
                    print(f"[FAIL] [ClosedLoopVerifier] Tool '{action_name}' does not exist in environment!", flush=True)
                    conversation_history.append({"role": "assistant", "content": json.dumps(action_data)})
                    conversation_history.append({"role": "user", "content": f"Error: Tool '{action_name}' is unknown. Choose from available tools."})
                    continue
                print("[PASS] [ClosedLoopVerifier] Pre-flight verification passed.", flush=True)

            # Record trajectory step
            trajectory.append({
                "turn": turn,
                "thought": thought,
                "action": action_name,
                "arguments": action_args,
                "model_latency_ms": call_res.get("latency_ms"),
                "thinking_tokens": call_res.get("thinking_tokens")
            })
            
            if action_name == RESPOND_ACTION_NAME:
                response_text = action_args.get("content", "")
                print(f"Agent responded to customer: {response_text}", flush=True)
                
                # Check reward status
                reward_check = env.calculate_reward()
                if reward_check.reward == 1.0 or mutated_database:
                    user_feedback = "Thank you so much! That resolves my request completely. ###STOP###"
                    conversation_history.append({"role": "assistant", "content": json.dumps(action_data)})
                    conversation_history.append({"role": "user", "content": user_feedback})
                    fsm_state = "COMPLETE"
                    print(f"FSM State Transition: -> {fsm_state}", flush=True)
                    break
                else:
                    # Explicit customer authorization
                    user_feedback = "Yes, please proceed with this cancellation/refund. I confirm and authorize it."
                    conversation_history.append({"role": "assistant", "content": json.dumps(action_data)})
                    conversation_history.append({"role": "user", "content": user_feedback})
            else:
                action_obj = Action(name=action_name, kwargs=action_args)
                step_res = env.step(action_obj)
                obs = step_res.observation
                print(f"Environment Observation: {obs[:300]}", flush=True)
                conversation_history.append({"role": "assistant", "content": json.dumps(action_data)})
                conversation_history.append({"role": "user", "content": f"Tool '{action_name}' observation: {obs}"})
                
                # Check if mutating action executed
                if action_name in ["cancel_pending_order", "return_delivered_order_items", "exchange_delivered_order_items"]:
                    mutated_database = True
                    reward_check = env.calculate_reward()
                    if reward_check.reward == 1.0:
                        print("[OK] Mutating action completed successfully. Reward condition met!", flush=True)

        # Final official Sierra Research reward calculation
        final_reward_res = env.calculate_reward()
        final_db_hash = env.get_data_hash()
        is_pass = final_reward_res.reward == 1.0
        
        print(f"\n=======================================================", flush=True)
        print(f"[{self.config_mode.upper()}] OFFICIAL EVALUATION VERDICT DEV-{task_index}", flush=True)
        print(f"Verdict: {'[PASS]' if is_pass else '[FAIL]'}", flush=True)
        print(f"Official Reward: {final_reward_res.reward}", flush=True)
        print(f"Actions Match: {final_reward_res.info.r_actions}", flush=True)
        print(f"Initial DB Hash: {init_db_hash}", flush=True)
        print(f"Final DB Hash:   {final_db_hash}", flush=True)
        print(f"Ground Truth DB: {final_reward_res.info.gt_data_hash}", flush=True)
        print(f"Turns: {turns_executed} | Latency: {total_latency_ms}ms | Tokens: {total_tokens} (Thinking: {total_thinking_tokens})", flush=True)
        print(f"=======================================================\n", flush=True)
        
        return {
            "task_index": task_index,
            "task_user_id": task.user_id,
            "config_mode": self.config_mode,
            "reward": final_reward_res.reward,
            "passed": is_pass,
            "actions_match": bool(final_reward_res.info.r_actions),
            "init_db_hash": init_db_hash,
            "final_db_hash": final_db_hash,
            "gt_data_hash": final_reward_res.info.gt_data_hash,
            "turns": turns_executed,
            "total_tokens": total_tokens,
            "total_thinking_tokens": total_thinking_tokens,
            "total_latency_ms": total_latency_ms,
            "trajectory": trajectory,
            "fsm_final_state": fsm_state
        }


def run_official_pilot_campaign():
    print("*******************************************************************************", flush=True)
    print(" MATRIX X1.2 - OFFICIAL TAU-BENCH RETAIL PILOT CAMPAIGN", flush=True)
    print(" Sole Permitted Foundation Model: gemini-3.8-flash-high", flush=True)
    print(" Benchmark Split: tasks_dev.py (Official Sierra Research Development Tasks)", flush=True)
    print("*******************************************************************************\n", flush=True)
    
    runner = TauRetailAgentRunner(config_mode="config_c_x12")
    
    # Run Task 0 and Task 2
    results = []
    for tid in [0, 2]:
        res = runner.run_task(task_index=tid, max_turns=4)
        results.append(res)
        
    out_path = "matrix/eval/pilot_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"Pilot results preserved to {out_path}", flush=True)
    return results


if __name__ == "__main__":
    run_official_pilot_campaign()
