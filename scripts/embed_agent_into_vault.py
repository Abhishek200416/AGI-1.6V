"""
scripts/embed_agent_into_vault.py
Embeds a complete, standalone, self-contained copy of the AGI 1.5 OMEGA EVOLUTION
agent engine inside the AGI_Obsidian_Vault directory so anyone cloning or receiving
the vault can directly execute the agent.
"""

import os
import shutil

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VAULT_DIR = os.path.join(ROOT_DIR, "AGI_Obsidian_Vault")
ENGINE_DIR = os.path.join(VAULT_DIR, "agent_engine")

def copy_tree_clean(src, dst):
    if os.path.exists(dst):
        shutil.rmtree(dst)
    
    def ignore_patterns(path, names):
        return [n for n in names if n == "__pycache__" or n.endswith(".pyc")]
    
    shutil.copytree(src, dst, ignore=ignore_patterns)

def embed_agent():
    print(f">>> Embedding AGI 1.5 engine into vault at: {ENGINE_DIR}")
    os.makedirs(ENGINE_DIR, exist_ok=True)

    # 1. Copy agi codebase
    src_agi = os.path.join(ROOT_DIR, "agi")
    dst_agi = os.path.join(ENGINE_DIR, "agi")
    copy_tree_clean(src_agi, dst_agi)
    print(f"    - Copied agi/ runtime code ({len(os.listdir(dst_agi))} packages)")

    # 2. Copy config/agi15
    src_cfg = os.path.join(ROOT_DIR, "config", "agi15")
    dst_cfg = os.path.join(ENGINE_DIR, "config", "agi15")
    copy_tree_clean(src_cfg, dst_cfg)
    print(f"    - Copied config/agi15 manifests")

    # 3. Create run_agi_15.py standalone runner
    runner_code = '''"""
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
        
        print("\\n[+] STARTUP COMPATIBILITY GATE: PASSED")
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
        
        print("\\n[*] Executing sample autonomous health diagnostic rollout...")
        res = agent.execute_mission({"prompt": "System self-test and operational verification."})
        print(f"[+] Mission Completed: Status={res.get('status')} | ID={res.get('mission_id')}")
        print("\\n[✓] AGI 1.5 Engine is ACTIVE and ready for missions.")
        
    except Exception as e:
        print(f"\\n[-] Startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
'''
    with open(os.path.join(ENGINE_DIR, "run_agi_15.py"), "w", encoding="utf-8") as f:
        f.write(runner_code.strip() + "\n")
    print("    - Created run_agi_15.py launcher")

    # 4. Create run_agent.bat
    bat_code = """@echo off
echo Starting AGI 1.5 OMEGA EVOLUTION Runtime...
python run_agi_15.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python failed or not found in PATH.
    pause
)
"""
    with open(os.path.join(ENGINE_DIR, "run_agent.bat"), "w", encoding="utf-8") as f:
        f.write(bat_code.strip() + "\n")
    print("    - Created run_agent.bat")

    # 5. Create run_agent.ps1
    ps1_code = """Write-Host "Starting AGI 1.5 OMEGA EVOLUTION Runtime..." -ForegroundColor Cyan
python run_agi_15.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nError launching AGI 1.5. Ensure Python 3.11+ is installed." -ForegroundColor Red
}
"""
    with open(os.path.join(ENGINE_DIR, "run_agent.ps1"), "w", encoding="utf-8") as f:
        f.write(ps1_code.strip() + "\n")
    print("    - Created run_agent.ps1")

    # 6. Create README.md
    readme_code = """# AGI 1.5 OMEGA EVOLUTION — Embedded Agent Engine

This directory contains a complete, self-contained copy of the **AGI 1.5 OMEGA EVOLUTION** autonomous runtime.

## Quickstart

### 1. Requirements
- Python 3.11+
- Antigravity runtime CLI (`agy.exe`) configured with `gemini-3.8-flash-high`
- Windows 10/11 x64

### 2. Launching the Agent
Run directly using Python:
```bash
python run_agi_15.py
```
Or double-click:
- `run_agent.bat` (Command Prompt)
- `run_agent.ps1` (PowerShell)

### 3. Architecture Invariants
- **Foundation Model**: `gemini-3.8-flash-high` exclusively (Directive 0)
- **Memory**: 500 logical strata backed by write-ahead logging (WAL)
- **Capabilities**: 1,200 registered tools with schema validation
- **Concurrency**: 500-worker DynTaskMAS DAG scheduler
- **Storage**: Primary target `D:\\AGI_Storage\\AGI_1_5` with automatic local fallback
"""
    with open(os.path.join(ENGINE_DIR, "README.md"), "w", encoding="utf-8") as f:
        f.write(readme_code.strip() + "\n")
    print("    - Created README.md")

    # 7. Add an Obsidian note inside the vault explaining how to run the engine
    note_content = """---
tags: [agi15-core, launcher]
aliases: [Run AGI 1.5, Agent Engine Launcher]
---
# Running the AGI 1.5 Engine

This vault includes a self-contained executable copy of the complete [[AGI 1.5 OMEGA EVOLUTION]] engine in the `agent_engine/` folder.

## How to Launch
Anyone who clones or opens this vault folder can directly run the agent:

### Option 1: Terminal / Command Prompt
```bash
cd agent_engine
python run_agi_15.py
```

### Option 2: Windows 1-Click Launchers
Inside the `agent_engine/` folder:
- Double-click `run_agent.bat`
- Or execute `run_agent.ps1` in PowerShell

## What Starts Up
When launched, the engine:
1. Runs the [[Startup Compatibility Gate]] confirming version `1.5.0` invariants.
2. Mounts the [[500-Stratum Memory Engine]] and binds to [[External Storage Volume D]] (or local fallback).
3. Initializes the [[1200 Universal Capability Registry]].
4. Activates the [[DynTaskMAS DAG Scheduler (500 Workers)]].
5. Engages the [[AgentLAB Multi-Turn Injection Shield]] and [[Pre-Socket SSRF Firewall]].

Connected to: [[AGI 1.5 OMEGA EVOLUTION]]
"""
    vault_note_path = os.path.join(VAULT_DIR, "00 - Master Hub", "Running the AGI 1.5 Engine.md")
    with open(vault_note_path, "w", encoding="utf-8") as f:
        f.write(note_content.strip() + "\n")
    print(f"    - Added 'Running the AGI 1.5 Engine.md' note into Obsidian Vault")

    # Update Master Hub note to link to the launcher note
    master_hub_path = os.path.join(VAULT_DIR, "00 - Master Hub", "AGI 1.5 OMEGA EVOLUTION.md")
    if os.path.exists(master_hub_path):
        with open(master_hub_path, "r", encoding="utf-8") as f:
            content = f.read()
        if "[[Running the AGI 1.5 Engine]]" not in content:
            content += "\n## Executable Engine Inside This Vault\n- Launch and run the code directly: [[Running the AGI 1.5 Engine]]\n"
            with open(master_hub_path, "w", encoding="utf-8") as f:
                f.write(content)
            print("    - Linked launcher note into Master Hub")

    print(">>> Agent engine successfully embedded into Obsidian Vault!")

if __name__ == "__main__":
    embed_agent()
