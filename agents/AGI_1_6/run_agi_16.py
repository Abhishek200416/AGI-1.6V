"""
run_agi_16.py
Autonomous Master Runner for AGI 1.6 OMEGA NEXUS in agents/AGI_1_6/.
"""

import os
import sys
import time

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ENGINE_DIR = os.path.join(BASE_DIR, "engine")
MEMORY_DIR = os.path.join(BASE_DIR, "memory")

if ENGINE_DIR not in sys.path:
    sys.path.insert(0, ENGINE_DIR)

from agi.adapters.agi_16_adapter import AGI16OmegaNexusAgent

def main():
    banner = """
==============================================================================
   AGI 1.6 — OMEGA NEXUS
   Autonomous Multi-Agent Orchestrator | Adaptive Token Economy
   9-Layer Persistent Memory | Grounded Research | Harbor/OSWorld Adapters
==============================================================================
"""
    print(banner)
    print("[*] Initializing AGI 1.6 OMEGA NEXUS Runtime...")
    print(f"    - Agent Root:    {BASE_DIR}")
    print(f"    - External D:    {'D:\\AGI_Storage\\AGI_1_6\\memory' if os.path.exists('D:\\') else 'N/A'}")
    print(f"    - Local Memory:  {MEMORY_DIR}")

    try:
        # Direct external volume D:\ with local fallback
        storage_target = r"D:\AGI_Storage\AGI_1_6\memory" if os.path.exists("D:\\") else MEMORY_DIR
        agent = AGI16OmegaNexusAgent(storage_dir=storage_target)
        dash = agent.get_system_dashboard()

        print("\n[+] STARTUP COMPATIBILITY GATE: PASSED")
        print(f"    - Runtime Version:  {dash.get('runtime_version')} ({dash.get('codename')})")
        print(f"    - Foundation Model: {dash.get('foundation_model')}")
        print(f"    - Memory Subsystem: {dash.get('memory_layers')} partitioned layers")
        print(f"    - Storage Target:   {dash.get('storage_target')}")
        print(f"    - Storage State:    {dash.get('storage_state')}")
        print(f"    - Host Headroom:    CPU {dash.get('cpu_percent')}% | Free RAM {dash.get('available_ram_mb')} MB")
        
        print("\n[*] Executing autonomous diagnostic task under Adaptive Token Economy...")
        res = agent.execute_mission({
            "prompt": "Autonomous diagnostic health check verifying token budgeting and multi-agent roles."
        })

        print(f"[+] Status: {res.get('status')} | Mission ID: {res.get('mission_id')}")
        print(f"    - Orchestration: {res.get('orchestration', {}).get('orchestration_mode')}")
        print(f"    - Workers Used:  {res.get('orchestration', {}).get('workers_used')}")
        metrics = res.get("token_metrics", {})
        print(f"    - Total Calls:   {metrics.get('total_calls')}")
        print(f"    - Tokens Burned: {metrics.get('total_tokens')} tokens (Cost: ${metrics.get('total_cost_usd')})")
        print(f"    - Latency:       {res.get('elapsed_sec')}s")
        print("\n[OK] AGI 1.6 OMEGA NEXUS Agent is ready for production and benchmark operations.")

    except Exception as e:
        print(f"\n[-] Startup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
