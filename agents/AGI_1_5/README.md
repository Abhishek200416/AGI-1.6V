# AGI 1.5 OMEGA EVOLUTION — Dedicated Agent Environment

This folder contains the complete, isolated, self-contained **AGI 1.5 OMEGA EVOLUTION** runtime.

## Directory Structure
```text
AGI_1_5/
├── run_agi_15.py             # Master Python entrypoint
├── run_agent.bat             # 1-click Windows batch launcher
├── run_agent.ps1             # PowerShell launcher
├── engine/                   # Complete Python runtime engine (agi/)
├── config/                   # AGI 1.5 configuration & capability manifests
├── memory/                   # Dedicated memory store & recovery WAL journals
├── docs/                     # ONLY AGI 1.5 specifications and dossiers
├── tests/                    # ONLY AGI 1.5 test suites (112,735 tests)
├── scripts/                  # Mutation testing and evaluation scripts
├── reports/                  # Interactive visual benchmark dashboard
└── vault/                    # Exclusive AGI 1.5 Obsidian Knowledge Graph
```

## Quickstart

### Launching the Agent
Run directly using Python:
```bash
python run_agi_15.py
```
Or double-click `run_agent.bat` (Windows).

### Running Test Verification
```bash
python -m pytest tests/test_agi_15_core_suite.py
```

### Exploring in Obsidian
Open the `vault/` subfolder in Obsidian to explore the live interactive knowledge graph.
