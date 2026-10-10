"""
run_agi_15.py
Autonomous runner for AGI 1.5 OMEGA EVOLUTION located in agents/AGI_1_5/.
"""

import os
import sys
import json
import time

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ENGINE_DIR = os.path.join(BASE_DIR, "engine")
MEMORY_DIR = os.path.join(BASE_DIR, "memory")

if ENGINE_DIR not in sys.path:
    sys.path.insert(0, ENGINE_DIR)

from agi.adapters.agi_15_adapter import AGI15OmegaEvolutionAgent

def main():
    banner = """
==============================================================================
   AGI 1.5 — OMEGA EVOLUTION
   Dedicated Isolated Agent Environment: agents/AGI_1_5
   500 Memory Strata | 1,200 Capabilities | 500 Concurrency Workers
==============================================================================
"""
    print(banner)
    print("[*] Launching AGI 1.5 with dedicated local memory redirection...")
    print(f"    - Agent Root:   {BASE_DIR}")
    print(f"    - Memory Path:  {MEMORY_DIR}")
    
    try:
        agent = AGI15OmegaEvolutionAgent(storage_dir=MEMORY_DIR)
        dash = agent.get_mission_dashboard()
        
        print("\n[+] STARTUP COMPATIBILITY GATE: PASSED")
        print(f"    - Version:          {dash.get('runtime_version')} ({dash.get('codename')})")
        print(f"    - Foundation Model: {dash.get('foundation_model')}")
        print(f"    - Memory Strata:    {dash.get('memory_strata_count')} strata across 36 families")
        print(f"    - Capabilities:     {dash.get('registered_capabilities_count')} registered")
        print(f"    - Telemetry:        {dash.get('telemetry_attributes_count')} semantic attributes")
        print(f"    - Concurrency:      {dash.get('max_concurrency_workers')} workers")
        print(f"    - Storage Target:   {dash.get('absolute_storage_path')}")
        print(f"    - Storage State:    {dash.get('storage_state')}")
        print(f"    - Host Platform:    {dash.get('host_os')} ({dash.get('cpu_cores')} cores)")
        
        print("\n[*] Running autonomous diagnostic verification...")
        res = agent.execute_mission({"prompt": "Diagnostic health check on dedicated AGI 1.5 environment."})
        print(f"[+] Status: {res.get('status')} | Mission ID: {res.get('mission_id')}")
        print("\n[✓] AGI 1.5 Agent is ready for autonomous execution.")
        
    except Exception as e:
        print(f"\n[-] Startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
