# AGI 1.5 OMEGA EVOLUTION — Autonomous Frontier Intelligence Platform

[![Runtime](https://img.shields.io/badge/Runtime-v1.5.0-blue.svg)](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_5/run_agi_15.py)
[![Model](https://img.shields.io/badge/Sole%20Model-gemini--3.8--flash--high-green.svg)](https://deepmind.google/technologies/gemini/)
[![Memory Strata](https://img.shields.io/badge/Memory%20Strata-500%20Strata-orange.svg)](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_5/engine/agi/memory/omega_memory.py)
[![Capabilities](https://img.shields.io/badge/Capabilities-1%2C200%20Verified-purple.svg)](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_5/engine/agi/capabilities/capability_registry.py)
[![Concurrency](https://img.shields.io/badge/Concurrency-500%20Workers-red.svg)](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_5/engine/agi/orchestration/omega_dag_scheduler.py)
[![Telemetry](https://img.shields.io/badge/Telemetry-2%2C000%20Attributes-teal.svg)](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_5/engine/agi/orchestration/omega_telemetry.py)

Welcome to the official repository for **AGI 1.5 OMEGA EVOLUTION**. This repository hosts the production-ready, fully self-contained autonomous agent platform powered exclusively by **Gemini 3.8 Flash High (`gemini-3.8-flash-high`)** through the Antigravity runtime.

---

## 🏛️ Isolated Agent Architecture

This repository strictly enforces an **isolated per-agent folder standard**:
Every agent version resides entirely inside its own dedicated directory under `agents/<AGENT_NAME>/`.

```text
AGI-1.5V/
├── README.md                          # Repository guide & architecture standard
├── .gitignore                         # Strict repository boundary rules
├── AGI_Obsidian_Vault.zip             # Portable Obsidian Knowledge Graph (514 KB)
└── agents/
    └── AGI_1_5/                       # Isolated, complete AGI 1.5 Agent (~3.6 MB)
        ├── run_agi_15.py              # Master Python entrypoint
        ├── run_agent.bat              # 1-Click Windows Batch launcher
        ├── run_agent.ps1              # 1-Click PowerShell launcher
        ├── README.md                  # AGI 1.5 specific guide
        ├── AGI_1_5_Obsidian_Vault.zip # Local bundled knowledge vault
        ├── engine/                    # Complete Python runtime engine (agi/)
        │   └── agi/
        │       ├── adapters/          # Unified Master Platform Adapter
        │       ├── capabilities/      # 1,200 Universal Capability Registry
        │       ├── memory/            # 500-Stratum Persistent Memory Engine
        │       ├── orchestration/     # DynTaskMAS DAG Wavefront Concurrency (500 workers)
        │       ├── research/          # 10-Stage Observable Live Knowledge Pipeline
        │       ├── runtime/           # Startup Compatibility Gate (v1.5.0)
        │       ├── security/          # Multi-Turn Injection & Pre-Socket SSRF Shield
        │       └── terminal/          # Stateful PTY & execution sandbox
        ├── config/                    # Invariant profiles & migration manifests
        ├── memory/                    # Dedicated local persistent memory & recovery WAL
        │   ├── store.json             # Content-addressed SHA-256 memory store
        │   ├── omega_memory_store.json# Active stratum state
        │   ├── snapshots/             # Checkpoint snapshots
        │   └── recovery/              # Write-Ahead Log (wal.jsonl) & journal.json
        ├── docs/                      # ONLY AGI 1.5 official specifications & dossiers
        │   ├── AGI-1.5-OMEGA-EVOLUTION-RELEASE-DOSSIER.md
        │   ├── AGI-1.5-DEEP-CAPABILITY-SCORECARD.md
        │   ├── AGI-1.5-MIGRATION-REPORT.md
        │   ├── AGI-1.5-RESEARCH-REGISTER.md
        │   └── AGI-1.5-TEST-INTEGRITY-AUDIT.md
        ├── tests/                     # ONLY AGI 1.5 verification suites (10 test suites)
        ├── scripts/                   # Mutation testing & autonomous evaluation scripts
        ├── reports/                   # Interactive visual benchmark dashboard
        └── vault/                     # Exclusive AGI 1.5 Obsidian Knowledge Graph
```

### Future Agent Versioning Rule:
1. When upgrading to a new agent version (e.g. `AGI_1_6`), create a new isolated folder: `agents/AGI_1_6/`.
2. Copy the baseline from the previous agent into the new folder.
3. Update code, tests, docs, and manifests inside `agents/AGI_1_6/`.
4. Memory paths redirect strictly to `agents/AGI_1_6/memory/`.
5. **No agent files or memory stores may ever merge or cross-contaminate.**
6. Legacy agent documents (Base, AGI 1.2, 1.3, 1.4) are completely purged from this repository.

---

## 📊 Size Accounting & Footprint

AGI 1.5 is engineered for maximum performance with an ultra-compact footprint:

| Component | Path | Files | Size (KB) | Size (MB) |
|---|---|---|---|---|
| **Python Engine** | `agents/AGI_1_5/engine/` | 42 | 2,980.04 KB | 2.910 MB |
| **Obsidian Vault (unpacked)** | `agents/AGI_1_5/vault/` | 33 | 25.98 KB | 0.026 MB |
| **Obsidian Vault (zip)** | `agents/AGI_1_5/AGI_1_5_Obsidian_Vault.zip` | 1 | 502.69 KB | 0.491 MB |
| **Test Suites** | `agents/AGI_1_5/tests/` | 10 | 51.66 KB | 0.050 MB |
| **Evaluation Scripts** | `agents/AGI_1_5/scripts/` | 3 | 59.68 KB | 0.058 MB |
| **Official Documentation** | `agents/AGI_1_5/docs/` | 5 | 27.06 KB | 0.026 MB |
| **Benchmark Dashboard** | `agents/AGI_1_5/reports/` | 1 | 25.82 KB | 0.025 MB |
| **Configuration Manifests**| `agents/AGI_1_5/config/` | 4 | 13.76 KB | 0.014 MB |
| **Dedicated Memory** | `agents/AGI_1_5/memory/` | 4 | 1.45 KB | 0.001 MB |
| **Launchers & Entrypoints** | `run_agi_15.py`, `.bat`, `.ps1`, `README` | 4 | 4.25 KB | 0.004 MB |
| **TOTAL AGI 1.5 AGENT** | `agents/AGI_1_5/` | **104** | **3,692.39 KB** | **~3.60 MB** |

---

## 🚀 Quickstart: Running AGI 1.5

Anyone can clone and run AGI 1.5 directly with zero friction.

### 1. Clone the Repository
```bash
git clone https://github.com/Abhishek200416/AGI-1.5V.git
cd AGI-1.5V
```

### 2. Launch AGI 1.5

#### Option A: Direct Python Execution
```bash
python agents/AGI_1_5/run_agi_15.py
```

#### Option B: 1-Click Launchers (Windows)
Navigate into `agents/AGI_1_5/` and double-click or run:
```powershell
# PowerShell
.\agents\AGI_1_5\run_agent.ps1

# Or Command Prompt / Batch
.\agents\AGI_1_5\run_agent.bat
```

### 3. Verify Health & Tests
Run the AGI 1.5 core test suite:
```bash
python -m pytest agents/AGI_1_5/tests/test_agi_15_core_suite.py
```

### 4. Interactive Visual Dashboards
- **Obsidian Knowledge Graph**: Open `agents/AGI_1_5/vault/` directly in [Obsidian](https://obsidian.md/) to visualize the live 33-note neural knowledge mesh.
- **Benchmark Dashboard**: Open `agents/AGI_1_5/reports/AGI_1_5_BENCHMARK_DASHBOARD.html` in any web browser to view performance charts across all 10 standard benchmarks.

---

## ⚡ Core Technical Specifications

- **Sole Foundation Model (Directive 0)**: Gemini 3.8 Flash High (`gemini-3.8-flash-high`) via Antigravity CLI runtime. Zero silent fallbacks to low-tier models.
- **500 Memory Strata**: High-throughput WAL journaling, content-addressed SHA-256 storage, triple Ebbinghaus scoring across 36 functional strata families.
- **12-State Disconnection Engine**: Explicit state machine (`HEALTHY`, `DEGRADED`, `READ_ONLY`, `DISCONNECTED`, `JOURNALING_PENDING`, `RECONNECTING`, `REPLAYING`, `VALIDATING_INTEGRITY`, `RECONCILIATION_REQUIRED`, `RECOVERED`, `FAILED`, `SHUTTING_DOWN`).
- **1,200 Capabilities**: Deterministic preflight validation across 24 capability families.
- **DynTaskMAS Wavefront Concurrency**: Adaptive task DAG scheduler executing up to 500 concurrent workers with Tarjan cycle prevention.
- **2,000 Semantic Telemetry Attributes**: Full OpenTelemetry GenAI compliance across 20 namespaces.
- **AgentLAB Security Shield**: Multi-turn prompt injection defense and pre-socket SSRF protection blocking link-local/RFC 1918 egress.

---

## 🛡️ License & Operational Boundaries
- Financial Scope: Strictly market intelligence and paper trading simulation. Real-money broker APIs are blocked.
- Designed for autonomous execution, local self-healing, and reproducible research.
