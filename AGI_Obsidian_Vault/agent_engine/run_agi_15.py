"""
run_agi_15.py
Standalone launcher for AGI 1.5 OMEGA EVOLUTION embedded within the Obsidian Vault.
"""

import os
import sys
import json
import time

# Ensure current directory is on sys.path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from agi.adapters.agi_15_adapter import AGI15OmegaEvolutionAgent

def print_banner():
    banner = """
==============================================================================
   AGI 1.5 — OMEGA EVOLUTION (STANDALONE RUNTIME)
   Frontier Autonomous Cognitive Runtime
   External-Drive-First Persistence | 500 Strata | 1,200 Capabilities
==============================================================================
"""
    print(banner)

def main():
    print_banner()
    print("[*] Initializing AGI 1.5 runtime and executing Compatibility Gate...")
    
    try:
        agent = AGI15OmegaEvolutionAgent()
        dash = agent.get_mission_dashboard()
        
        print("\n[+] STARTUP COMPATIBILITY GATE: PASSED")
        print(f"    - Runtime Version:           {dash.get('runtime_version')} ({dash.get('codename')})")
        print(f"    - Foundation Model:          {dash.get('foundation_model')}")
        print(f"    - Memory Strata Count:       {dash.get('memory_strata_count')} strata across 36 families")
        print(f"    - Universal Capabilities:    {dash.get('registered_capabilities_count')} registered")
        print(f"    - OpenTelemetry Attributes:  {dash.get('telemetry_attributes_count')} semantic attributes")
        print(f"    - Concurrency Ceiling:       {dash.get('max_concurrency_workers')} workers")
        print(f"    - Storage Target:            {dash.get('absolute_storage_path')}")
        print(f"    - Storage State:             {dash.get('storage_state')}")
        print(f"    - External Drive Primary:    {dash.get('is_on_external_drive')}")
        print(f"    - Host Platform:             {dash.get('host_os')} ({dash.get('cpu_cores')} cores)")
        
        print("\n[*] Executing sample autonomous health diagnostic rollout...")
        res = agent.execute_mission({"prompt": "System self-test and operational verification."})
        print(f"[+] Mission Completed: Status={res.get('status')} | ID={res.get('mission_id')}")
        print("\n[✓] AGI 1.5 Engine is ACTIVE and ready for missions.")
        
    except Exception as e:
        print(f"\n[-] Startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
