"""
agi/adapters/tau_bench_adapter.py
AGI 0.7 — Sierra Research tau-bench Official Benchmark Adapter

Evaluates AGI 0.7 and baseline MATRIX X1.2 on authentic retail domain tasks.
Uses official MockRetailDomainEnv and official calculate_reward() state hash grader.
"""

import os
import sys
import json
import time
from typing import Dict, Any, List, Optional

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

from agi.adapters.agi_agent_adapter import AGI07Agent, MODEL_IDENTIFIER


class NonBlockingCustomerUser(BaseUserSimulationEnv):
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
        if any(w in lower for w in ["confirm", "proceed", "would you like", "authorize", "reply with 'yes'"]):
            return "Yes, I confirm and authorize this. Please proceed with the change and full refund."
        if any(w in lower for w in ["cancelled", "refunded", "success", "completed", "done"]):
            return "Thank you so much! That resolves my request. ###STOP###"
        return "Yes, please continue and resolve my request as requested."

    def get_total_cost(self) -> float:
        return 0.0


def run_tau_bench_task(task_index: int, agent_type: str = "agi_0_7", max_turns: int = 5) -> Dict[str, Any]:
    print(f"\n=======================================================", flush=True)
    print(f"[{agent_type.upper()}] RUNNING TAU-BENCH DEV TASK {task_index}", flush=True)
    print(f"=======================================================", flush=True)
    
    env = MockRetailDomainEnv(task_split="dev", task_index=task_index, user_strategy="human")
    env.user = NonBlockingCustomerUser(env.task.instruction)
    
    task = env.task
    init_db_hash = env.get_data_hash()
    print(f"Customer User ID: {task.user_id}", flush=True)
    print(f"Customer Instruction: {task.instruction}", flush=True)
    print(f"Ground Truth Actions: {task.actions}", flush=True)
    print(f"Initial DB Hash: {init_db_hash}", flush=True)
    
    agent = AGI07Agent(task_name=f"tau_retail_task_{task_index}", domain_rules=env.rules)
    
    # Register all domain tools in AGI 0.7 closed-world registry
    for tool_spec in env.tools_info:
        fn = tool_spec["function"]
        tool_name = fn["name"]
        
        # Create closure for tool execution against live environment
        def make_handler(name):
            def handler(**kwargs):
                act = Action(name=name, kwargs=kwargs)
                step_res = env.step(act)
                return step_res.observation
            return handler
            
        agent.tools.register(
            name=tool_name,
            description=fn.get("description", ""),
            parameters=fn.get("parameters", {}),
            handler=make_handler(tool_name)
        )
        
    system_prompt = agent.build_system_prompt(task.instruction, store_wiki=env.wiki)
    agent.conversation_history.append({"role": "system", "content": system_prompt})
    
    initial_user_msg = f"Hello. My name is {task.user_id.split('_')[0].capitalize()} {task.user_id.split('_')[1].capitalize()}. {task.instruction}"
    
    trajectory = []
    current_msg = initial_user_msg
    
    for turn in range(1, max_turns + 1):
        print(f"\n--- TURN {turn}/{max_turns} [FSM: {agent.state}] ---", flush=True)
        print(f"Input: {current_msg[:120]}...", flush=True)
        
        parsed_action, call_res = agent.step(current_msg)
        
        if not parsed_action or not call_res.get("success"):
            print(f"[FAIL] Model invocation or parse failed: {call_res.get('error')}", flush=True)
            break
            
        thought = parsed_action.get("thought", "")
        action_name = parsed_action.get("action", "")
        arguments = parsed_action.get("arguments", {})
        
        print(f"Thought: {thought[:140]}...", flush=True)
        print(f"Action: {action_name}({arguments})", flush=True)
        
        trajectory.append({
            "turn": turn,
            "thought": thought,
            "action": action_name,
            "arguments": arguments,
            "latency_ms": call_res.get("latency_ms"),
            "thinking_tokens": call_res.get("thinking_tokens")
        })
        
        if action_name == "respond" or action_name == RESPOND_ACTION_NAME:
            user_reply = env.user.step(arguments.get("content", ""))
            print(f"Customer reply: {user_reply}", flush=True)
            if "###STOP###" in user_reply:
                print("Customer signaled request complete. Ending episode.", flush=True)
                break
            current_msg = user_reply
        else:
            # Execute tool via AGI 0.7 ToolRegistry
            tool_res = agent.tools.execute(action_name, arguments)
            if tool_res["success"]:
                obs = tool_res["result"]
                print(f"Tool Observation: {str(obs)[:150]}", flush=True)
                current_msg = f"Tool '{action_name}' returned: {obs}"
            else:
                err = tool_res["error"]
                print(f"Tool Error: {err}", flush=True)
                current_msg = f"Tool '{action_name}' failed: {err}"
                
    # Evaluate final reward and state
    final_db_hash = env.get_data_hash()
    eval_res = env.calculate_reward()
    passed = eval_res.reward >= 1.0
    
    agent.finish(success=passed, final_evidence={
        "reward": eval_res.reward,
        "actions_match": eval_res.info.r_actions,
        "init_db_hash": init_db_hash,
        "final_db_hash": final_db_hash
    })
    
    print(f"\n=======================================================", flush=True)
    print(f"TASK {task_index} VERDICT: {'PASSED' if passed else 'FAILED'}", flush=True)
    print(f"Reward: {eval_res.reward} | Actions Match: {eval_res.info.r_actions}", flush=True)
    print(f"Initial Hash: {init_db_hash}", flush=True)
    print(f"Final Hash:   {final_db_hash}", flush=True)
    print(f"Total Tokens: {agent.total_tokens} (Thinking: {agent.thinking_tokens})", flush=True)
    print(f"Total Latency: {agent.total_latency_ms}ms", flush=True)
    print(f"=======================================================\n", flush=True)
    
    return {
        "task_index": task_index,
        "agent": agent_type,
        "reward": eval_res.reward,
        "passed": passed,
        "actions_match": eval_res.info.r_actions == 1.0,
        "init_db_hash": init_db_hash,
        "final_db_hash": final_db_hash,
        "turns": agent.turn_count,
        "total_tokens": agent.total_tokens,
        "thinking_tokens": agent.thinking_tokens,
        "total_latency_ms": agent.total_latency_ms,
        "trajectory": trajectory
    }
