# AGI 1.5 OMEGA EVOLUTION — Embedded Agent Engine

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
- **Storage**: Primary target `D:\AGI_Storage\AGI_1_5` with automatic local fallback
