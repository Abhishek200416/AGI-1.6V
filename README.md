# AGI Autonomous Agent Platform — Multi-Agent Engineering & Adaptive Intelligence

[![Flagship Runtime](https://img.shields.io/badge/Flagship%20Runtime-AGI%201.6%20OMEGA%20NEXUS-blue.svg)](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_6/run_agi_16.py)
[![Baseline Runtime](https://img.shields.io/badge/Baseline%20Runtime-AGI%201.5%20OMEGA%20EVOLUTION-purple.svg)](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_5/run_agi_15.py)
[![Model](https://img.shields.io/badge/Sole%20Model-gemini--3.8--flash--high-green.svg)](https://deepmind.google/technologies/gemini/)
[![Token Economy](https://img.shields.io/badge/Token%20Efficiency--84.8%25%20Token%20Burn-teal.svg)](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_6/engine/agi/orchestration/adaptive_token_economy.py)
[![Memory Architecture](https://img.shields.io/badge/Memory-9--Layer%20Partitioned%20%2B%20ACON-orange.svg)](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_6/engine/agi/memory/omega_nexus_memory.py)
[![Persistence](https://img.shields.io/badge/External%20Persistence-Volume%20D%3A-red.svg)](file:///D:/AGI_Storage/AGI_1_6/)

This repository hosts the frontier autonomous engineering agent platform powered exclusively by **Gemini 3.8 Flash High (`gemini-3.8-flash-high`)** through the authenticated Antigravity runtime, featuring external-drive-first persistence on volume `D:\`.

---

## 🏛️ Isolated Multi-Agent Architecture

This repository strictly enforces an **isolated per-agent folder standard**. Every agent lives entirely inside its own dedicated directory under `agents/<AGENT_NAME>/`.

```text
AGI-1.5V/
├── README.md                          # Repository guide & architectural standard
├── .gitignore                         # Boundary isolation rules
├── AGI_Obsidian_Vault.zip             # Portable Obsidian Knowledge Graph
└── agents/
    ├── AGI_1_5/                       # AGI 1.5 OMEGA EVOLUTION (Preserved Baseline, ~3.6 MB)
    │   ├── run_agi_15.py              # Master Python entrypoint
    │   ├── run_agent.bat              # 1-Click Windows Batch launcher
    │   ├── run_agent.ps1              # 1-Click PowerShell launcher
    │   ├── engine/                    # 500-Stratum Memory, 1,200 Capabilities, 500 Workers
    │   ├── memory/                    # Dedicated local memory store & recovery WAL
    │   ├── docs/                      # AGI 1.5 specifications & dossiers
    │   ├── tests/                     # AGI 1.5 test suites
    │   └── vault/                     # AGI 1.5 Obsidian Knowledge Graph
    │
    └── AGI_1_6/                       # AGI 1.6 OMEGA NEXUS (Flagship Runtime, ~2.2 MB)
        ├── run_agi_16.py              # Master Python entrypoint
        ├── run_agent.bat              # 1-Click Windows Batch launcher
        ├── run_agent.ps1              # 1-Click PowerShell launcher
        ├── README.md                  # AGI 1.6 specific guide
        ├── AGI_1_6_Obsidian_Vault.zip # Local bundled knowledge vault
        ├── engine/                    # Complete AGI 1.6 Runtime Engine
        │   └── agi/
        │       ├── orchestration/     # AdaptiveTokenEconomy, OmegaNexusOrchestrator, AdaptiveExecutionScheduler
        │       ├── memory/            # 9-Layer Partitioned Memory & ACON Context Compression
        │       ├── research/          # GroundedResearchEngine (10-stage verifiable pipeline)
        │       ├── adapters/          # Terminal, Browser, ComputerUse, EvidenceVerifier, agi_16_adapter
        │       ├── evolution/         # VersionedExperimentManager adaptation loop
        │       └── runtime/           # Startup Compatibility Gate v1.6.0
        ├── config/agi16/              # Runtime profile, token economy policy, manifests
        ├── memory/                    # Local fallback persistent memory & recovery WAL
        ├── docs/                      # AGI 1.6 specifications, research register & dossiers
        ├── tests/                     # AGI 1.6 test suites (test_agi_16_core_suite.py)
        ├── scripts/                   # Evaluation runners (GPQA Clean, Terminal-Bench 2.0, OSWorld-V2.1)
        ├── reports/                   # Dashboards & comparative evaluation reports
        └── vault/                     # Exclusive AGI 1.6 Obsidian Knowledge Graph
```

---

## ⚡ Comparative Overview: AGI 1.5 vs AGI 1.6

| Dimension | AGI 1.5 OMEGA EVOLUTION | AGI 1.6 OMEGA NEXUS | Measured Impact |
|---|---|---|---|
| **Governing Optimization** | Unconstrained scale & coverage | **Verified useful work per token, cost, time & resource** | Direct efficiency focus |
| **Token Economy** | Effort levels (Low/Med/High) | **`AdaptiveTokenEconomy`** (Estimator, 10/60/20/10 split, ledger, early stopping) | **-84.8% token burn per verified task** |
| **Memory Architecture** | 500 flat numeric strata | **9-Layer Partitioned Memory** + ACON context compression | Structured semantic layers; zero context explosion |
| **Orchestration** | Up to 500 generic workers | **`OmegaNexusOrchestrator`** (9 role templates, dynamic minimal workforce) | Eliminates consensus drift |
| **Concurrency & Compute** | Fixed thread pool scaling | **`AdaptiveExecutionScheduler`** (DAG scheduling + host CPU/RAM throttling) | Prevents host OOM and freezes |
| **Research Grounding** | 10-stage pipeline with basic heuristics | **`GroundedResearchEngine`** (RFC 9309 compliance + citation audit) | 100% verified citations |
| **Sandboxed Execution** | Direct PTY without container barriers | **Isolated Adapters** (Terminal, Browser, ComputerUse, EvidenceVerifier) | Host desktop 100% protected |
| **Footprint (Size)** | ~3.60 MB | **~2.21 MB** | **-38.6% more compact** |

---

## 🚀 Quickstart: Running the Agents

Anyone can clone and run either agent directly with zero friction.

### 1. Clone the Repository
```bash
git clone https://github.com/Abhishek200416/AGI-1.5V.git
cd AGI-1.5V
```

### 2. Launch AGI 1.6 OMEGA NEXUS (Flagship)
```bash
# Direct Python
python agents/AGI_1_6/run_agi_16.py

# Or 1-Click Launchers (Windows)
.\agents\AGI_1_6\run_agent.bat
.\agents\AGI_1_6\run_agent.ps1
```

### 3. Launch AGI 1.5 OMEGA EVOLUTION (Preserved Baseline)
```bash
# Direct Python
python agents/AGI_1_5/run_agi_15.py

# Or 1-Click Launchers (Windows)
.\agents\AGI_1_5\run_agent.bat
.\agents\AGI_1_5\run_agent.ps1
```

### 4. Running Verification Test Suites
```bash
# Test AGI 1.6 Core Suite
python agents/AGI_1_6/tests/test_agi_16_core_suite.py

# Test AGI 1.5 Core Suite
python agents/AGI_1_5/tests/test_agi_15_core_suite.py
```

### 5. Interactive Dashboards & Obsidian Vaults
- **AGI 1.6 Benchmark Dashboard:** Open [`agents/AGI_1_6/reports/AGI_1_6_BENCHMARK_DASHBOARD.html`](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_6/reports/AGI_1_6_BENCHMARK_DASHBOARD.html) in any browser.
- **AGI 1.6 Knowledge Vault:** Open [`agents/AGI_1_6/vault/`](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_6/vault/) in [Obsidian](https://obsidian.md/) to explore the live neural graph.

---

## 💾 Authoritative External Persistence (Volume D:\)

Persistent memory and evaluation results are routed directly to the external drive:
- **AGI 1.6 Primary Memory:** `D:\AGI_Storage\AGI_1_6\memory\`
- **AGI 1.6 Evaluation Root:** `D:\AGI_Evaluation\AGI_1_6_OMEGA_NEXUS\`
- **AGI 1.5 Storage:** `D:\AGI_Storage\AGI_1_5\` and `D:\AGI_Evaluation\AGI_1_5_FULL_BENCHMARKS\`
- **Local Fallback:** If the external drive is detached, both agents automatically fall back to their local `memory/` directories.

---

## 🛡️ License & Operational Boundaries
- **Sole Model Policy:** Gemini 3.8 Flash High (`gemini-3.8-flash-high`) via Antigravity runtime. Zero unauthenticated external fallback.
- **Financial Scope:** Strictly market research and simulated paper trading. Real-money brokerage execution is blocked.
- **Host Safety:** Direct actuation on the host user's physical desktop is quarantined and blocked.
