# AGI 0.7 — Handover & Operational Maintenance Guide

**Document ID:** AGI-07-HANDOVER-MAINTENANCE-GUIDE-2026  
**Version:** 1.0.0  
**Status:** APPROVED & HANDOVER-READY  
**Target Release Line:** `AGI 0.7.x`  
**Governing Standard:** Ponytail Principle & Verified Antigravity Runtime  

---

## 1. System Overview & Core Architecture

AGI 0.7 is the frontier autonomous engineering and computer-use agent powered exclusively by `gemini-3.8-flash-high` through the Antigravity runtime CLI (`agy.exe`).

### 1.1 Directory Layout & Core Modules
```text
c:\Users\abhis\Downloads\pt\
├── agi/
│   ├── adapters/                  # Benchmark & Agent Integration Adapters
│   │   ├── agi_agent_adapter.py   # Core AGI 0.7 Python Bridge
│   │   ├── browsecomp_adapter.py  # BrowseComp Canonicalizer & Pipeline
│   │   ├── memoryarena_adapter.py # MemoryArena MockWebShop Bridge
│   │   └── tau_bench_adapter.py   # Tau-Bench Efficiency Adapter
│   ├── computer/                  # Computer & Browser Automation Adapter
│   ├── data/                      # Persistent Stores (Memory, Failure Registry, Evidence)
│   ├── evolution/                 # Verified Self-Improvement Engine
│   ├── finance/                   # Simulated Paper-Trading & Risk Watchdog
│   ├── memory/                    # 10-Tier Durable Memory Subsystem
│   ├── orchestration/             # Master Orchestrator FSM & Queue
│   ├── quality/                   # Failure Registry & Guard Framework
│   ├── security/                  # MCP Security Gateway (Realpath, SSRF, Scrubbing)
│   ├── skills/                    # Skill Factory & Lifecycle Registry
│   ├── tests/                     # Acceptance, Security & Regression Suites
│   ├── tools/                     # Closed-World Tool Registry
│   └── verification/              # Cryptographic Evidence Ledger (HMAC-SHA256)
├── matrix/                        # Preserved MATRIX X1.2 Baseline Architecture
├── .agents/                       # Preserved V4 Orchestration Architecture
└── tests/                         # Python Benchmark Verification Suites
```

---

## 2. Standard Operational Verification Commands

Always run these five commands before committing any changes to `feature/agi-0.7-hardening` or tagged releases:

```powershell
# 1. Orchestration Agent V4 Operational Suite (20 Tests)
node .agents/v4/tests/validation-suite.js

# 2. MATRIX X1.2 Architectural Upgrade Suite (9 Tests)
node matrix/tests/x12-architecture-suite.js

# 3. AGI 0.7 Operational Acceptance Suite (25 Tests)
node agi/tests/acceptance-suite.js

# 4. AGI 0.7 Security Hardening Suite (14 Tests)
node agi/tests/security-suite.js

# 5. AGI 0.7 Continuous Quality Protection Regression Guard (10 Guards)
node agi/tests/regression-guard-suite.js
```

All 5 suites must exit with code 0 (`78/78 PASS`).

---

## 3. External Benchmark Evaluation Commands

To run or re-verify external benchmark tasks:

```powershell
# 1. Run BrowseComp Repair Unit Tests (9 Tests)
.venv\Scripts\python.exe tests/test_browsecomp_repair.py

# 2. Run MemoryArena WebShop Repair Unit Tests (4 Tests)
.venv\Scripts\python.exe tests/test_memoryarena_repair.py

# 3. Run Tau-Bench Retail Repair Unit Tests (2 Tests)
.venv\Scripts\python.exe tests/test_tau_bench_repair.py

# 4. Run BrowseComp Hardened Evaluation Run (Tasks 1, 2, 3)
.venv\Scripts\python.exe scripts/eval_browsecomp_repaired.py

# 5. Run MemoryArena 12-Session Ablation (10-Tier vs Stateless vs Windowed)
.venv\Scripts\python.exe scripts/eval_memoryarena_ablation.py

# 6. Run Tau-Bench Retail Task & Comparison against MATRIX X1.2 Baseline
.venv\Scripts\python.exe scripts/eval_tau_bench_repaired.py
```

---

## 4. Maintenance Protocols & Invariant Policies

### 4.1 Sole Foundation Model Policy (Directive 0)
- The foundation model must always remain `gemini-3.8-flash-high`.
- Never introduce silent fallbacks to other model families or uncalibrated tiers.
- If model calls fail, capture the error code, log to the evidence ledger, and halt cleanly.

### 4.2 Financial Boundary Policy (Directive 3)
- Under no circumstances may real brokerage API keys or trading connections be added.
- All trading modules in `agi/finance/` are strictly paper-trading simulations with mandatory risk-of-ruin assertions.

### 4.3 Security Gateway Extension Checklist
When adding new tools to `agi/tools/tool-registry.js`:
1. Always enforce JSON schema validation on required input parameters.
2. If the tool accepts filesystem paths, validate containment via `mcpSecurityGateway.validatePathContainment(path)` (`fs.realpathSync`).
3. If the tool fetches network resources, validate URLs via `mcpSecurityGateway.validateTargetUrl(url)` (blocks loopback, cloud metadata, and RFC 1918 subnets).
4. Always pass return payloads through `mcpSecurityGateway.scrubSecrets(result)` to prevent credential leakage.

### 4.4 Failure Registry Protocol
When any new bug or benchmark failure is observed:
1. Register a new incident in `agi/data/failure-registry.json` using `agi/quality/failure-registry.js` with status `NEW`.
2. Document the root cause, target component, reproduction steps, and expected outcome.
3. Write an automated regression test in `tests/` or `agi/tests/`.
4. Implement the production fix.
5. Transition the incident status to `IN_PROGRESS` $\rightarrow$ `FIXED` $\rightarrow$ `VERIFIED`.
6. Add the check to `agi/tests/regression-guard-suite.js`.
