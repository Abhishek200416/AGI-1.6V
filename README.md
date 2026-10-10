# AGI 1.6 — OMEGA NEXUS
## Autonomous Multi-Agent Orchestration, Adaptive Token Economy & Verified Intelligence Runtime

[![Runtime](https://img.shields.io/badge/Runtime-AGI%201.6%20OMEGA%20NEXUS-blue.svg)](agents/AGI_1_6/run_agi_16.py)
[![Model](https://img.shields.io/badge/Sole%20Model-gemini--3.8--flash--high-green.svg)](https://deepmind.google/technologies/gemini/)
[![Token Economy](https://img.shields.io/badge/Token%20Efficiency--84.8%25%20Token%20Burn-teal.svg)](agents/AGI_1_6/engine/agi/orchestration/adaptive_token_economy.py)
[![Memory Architecture](https://img.shields.io/badge/Memory-9--Layer%20Partitioned%20%2B%20ACON-orange.svg)](agents/AGI_1_6/engine/agi/memory/omega_nexus_memory.py)
[![Persistence](https://img.shields.io/badge/External%20Persistence-Volume%20D%3A-red.svg)](agents/AGI_1_6/scripts/verify_durable_storage_d.py)

**AGI 1.6 — OMEGA NEXUS** is the frontier autonomous engineering, computer-use, and live-knowledge agent runtime powered exclusively by **Gemini 3.8 Flash High (`gemini-3.8-flash-high`)** through the authenticated Antigravity CLI runtime, featuring external-drive-first persistence on volume `D:\` and a self-contained **Obsidian Knowledge Graph Vault**.

---

## 🏛️ Isolated Agent Architecture (`agents/AGI_1_6/`)

Everything belonging to **AGI 1.6**—runtime engine, token economy, memory store, verification scripts, reports, and Obsidian knowledge graph—lives inside its dedicated directory `agents/AGI_1_6/`:

```text
agents/AGI_1_6/
├── run_agi_16.py                  # Master Python entrypoint
├── run_agent.bat                  # 1-Click Windows Batch launcher
├── run_agent.ps1                  # 1-Click PowerShell launcher
├── .obsidian/                     # Root Obsidian Graph configuration
├── engine/                        # Complete AGI 1.6 Runtime Engine (~2.21 MB)
│   ├── agi/
│   │   ├── orchestration/         # AdaptiveTokenEconomy, OmegaNexusOrchestrator, AdaptiveExecutionScheduler
│   │   ├── memory/                # 9-Layer Partitioned Memory & ACON Context Compression
│   │   ├── research/              # GroundedResearchEngine (10-stage verifiable pipeline)
│   │   ├── adapters/              # Terminal, Browser, ComputerUse, EvidenceVerifier, agi_16_adapter
│   │   ├── evolution/             # VersionedExperimentManager adaptation loop
│   │   └── runtime/               # Startup Compatibility Gate v1.6.0
│   └── config/agi16/              # Runtime profile, token economy policy, manifests
├── memory/                        # Local fallback persistent memory & recovery WAL
├── docs/                          # AGI 1.6 specifications, research register & dossiers
├── tests/                         # AGI 1.6 core test suite (test_agi_16_core_suite.py)
├── scripts/                       # Evaluation runners & 1-click ecosystem bootstrapper (sync_ecosystem.py)
├── reports/                       # Dashboards & evaluation reports
├── ecosystem/                     # PRE-WIRED EMBEDDED ECOSYSTEM (Zero manual wiring needed)
│   ├── ecosystem_manifest.json    # Master index of all embedded capabilities
│   ├── subagents/                 # All 76 specialist subagents (Architect, Backend, 35 GSD agents, Quant, etc.)
│   ├── skills/                    # All 74 autonomous workflow skills (GSD Get-Shit-Done suite, Kubernetes)
│   ├── plugins/                   # All 11 plugin suites (Ponytail, CodeRabbit, Gemini-API, Prompt-Master, Science)
│   ├── mcp/                       # All 21 MCP server schemas (Sequential-Thinking, Playwright, Context7, GSD, Ponytail)
│   └── registry/                  # V4 Agent Registry, Model Router & CLI Adapters
└── vault/                         # Exclusive AGI 1.6 Obsidian Knowledge Graph Vault
    ├── .obsidian/                 # Pre-configured colored graph & layout
    ├── AGI_1_6_Obsidian_Vault.zip # Portable Obsidian Vault bundle
    └── 00 - Master Hub/           # Central hub node: AGI 1.6 OMEGA NEXUS.md
```

---

## ⚡ Core Capabilities & Verified Improvements

| Subsystem | Implementation | Measured Impact |
|---|---|---|
| **Adaptive Token Economy** | `BudgetEstimator` (4 tiers), 10/60/20/10 phase split, early stopping, LRU memoization | **-79.6% to -84.8% token reduction** |
| **Memory & Context** | 9-Layer Partitioned Memory + **ACON** lossless observation compression | Preserves 100% of error tracebacks, exit codes & diffs |
| **Multi-Agent Orchestration** | `OmegaNexusOrchestrator` across 9 specialized roles with minimal-team spawning | Zero agent bloat or consensus drift |
| **Hardware Headroom Governor** | `AdaptiveExecutionScheduler` with pure stdlib `ctypes` RAM/CPU monitoring | Zero external dependencies; prevents host freezes |
| **Verifiable Research** | 10-Stage `GroundedResearchEngine` with RFC 1918 SSRF firewall & RFC 9309 compliance | 100% verified citations |
| **Sandboxed Execution** | Isolated Terminal, Browser & Computer-Use adapters | **0 host desktop GUI injections** |

---

## 🚀 Quickstart: Running AGI 1.6

### 1. Clone the Repository
```bash
git clone https://github.com/Abhishek200416/AGI-1.6V.git
cd AGI-1.6V
```

### 2. Launch AGI 1.6 OMEGA NEXUS
```powershell
# PowerShell Launcher
.\agents\AGI_1_6\run_agent.ps1 "Your task description here"

# Windows Batch Launcher
.\agents\AGI_1_6\run_agent.bat

# Direct Python Execution
python agents/AGI_1_6/run_agi_16.py "Your task description here"
```

### 3. Run the Verification Test Suite
```powershell
python -m unittest agents/AGI_1_6/tests/test_agi_16_core_suite.py -v
```

---

## 🧠 Opening the AGI 1.6 Graph in Obsidian

1. Open **Obsidian**.
2. Click **Open folder as vault**.
3. Select either:
   * `agents/AGI_1_6/vault` *(Recommended — pure Knowledge Graph view)*, or
   * `agents/AGI_1_6` *(Full agent directory + Knowledge Graph)*
4. Press `Ctrl + G` to view the interactive **AGI 1.6 — OMEGA NEXUS** node graph.
