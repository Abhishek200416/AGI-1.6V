# AGI 1.6 OMEGA NEXUS — Dedicated Agent Environment

This folder contains the complete, isolated, self-contained **AGI 1.6 OMEGA NEXUS** runtime.

---

## 🏛️ Directory Architecture
```text
AGI_1_6/
├── run_agi_16.py              # Master Python entrypoint
├── run_agent.bat              # 1-click Windows batch launcher
├── run_agent.ps1              # PowerShell launcher
├── README.md                  # Dedicated AGI 1.6 guide
├── AGI_1_6_Obsidian_Vault.zip # Local bundled knowledge vault
├── engine/                    # Complete Python runtime engine (agi/)
│   └── agi/
│       ├── adapters/          # Execution adapters (Terminal, Browser, ComputerUse, Verifier, agi_16_adapter)
│       ├── evolution/         # VersionedExperimentManager adaptation loop
│       ├── memory/            # 9-Layer Persistent Memory & ACON Context Compression
│       ├── orchestration/     # AdaptiveTokenEconomy, OmegaNexusOrchestrator, AdaptiveExecutionScheduler
│       ├── research/          # GroundedResearchEngine (10-stage verifiable pipeline)
│       ├── runtime/           # Startup Compatibility Gate v1.6.0
│       └── security/          # InjectionShield & SSRF Firewall
├── config/agi16/              # Configuration profiles & manifests
├── memory/                    # Local fallback persistent memory & recovery WAL
├── docs/                      # ONLY AGI 1.6 specifications, research register & dossiers
├── tests/                     # ONLY AGI 1.6 verification suites
├── scripts/                   # Evaluation runners (GPQA Clean, Terminal-Bench 2.0, OSWorld-V2.1)
├── reports/                   # Interactive visual benchmark dashboards & comparisons
└── vault/                     # Exclusive AGI 1.6 Obsidian Knowledge Graph
```

---

## 🚀 Quickstart

### Launching the Agent
Run directly using Python:
```bash
python run_agi_16.py
```
Or double-click `run_agent.bat` (Windows) / execute `.\run_agent.ps1`.

### Authoritative External Persistence
Primary storage and ledger writes target volume `D:\`:
- Memory: `D:\AGI_Storage\AGI_1_6\memory\`
- Evaluation & Artifacts: `D:\AGI_Evaluation\AGI_1_6_OMEGA_NEXUS\`
If disconnected, the agent falls back automatically to local `memory/`.

### Running Verification Tests
```bash
python tests/test_agi_16_core_suite.py
```

### Exploring in Obsidian
Open the `vault/` subfolder directly in Obsidian to view the live knowledge mesh.
