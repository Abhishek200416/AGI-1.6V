# MATRIX X1.1 — EXTERNAL BENCHMARK READINESS
**Audited Runtime:** Node.js v20.20.2 on Windows 11 x64  
**Benchmark Harness:** `matrix/evaluation/benchmark-orchestrator.js`  
**Registry & Adapters:** `benchmark-registry.js`, `benchmark-adapter.js`  
**Status:** FULLY INTEGRATED & CAMPAIGN READY

---

## 1. Overview of External Benchmark Adapters

Matrix X1.1 includes pluggable external benchmark adapters capable of ingesting raw external task sets, executing them via Matrix X1's tool and agent runtime, and normalizing results according to official evaluation protocols.

| Benchmark Suite | Focus Domain | Adapter Module | Ingestion Format | Evaluation Protocol | Readiness Status |
|:---|:---|:---|:---|:---|:---:|
| **GAIA** | General AI Assistant Multimodal Reasoning | `benchmark-adapter.js` | JSON / JSONL | Exact match, fuzzy string, file artifacts | **READY** |
| **BrowseComp** | Complex Web Search & Navigation | `benchmark-adapter.js` | Web Task JSON | Trajectory verification + DOM assertion | **READY** |
| **OSWorld** | Desktop Computer-Use & Multi-App OS | `benchmark-adapter.js` | Task Config JSON | OS state diff, file output, screenshot diff | **READY** |
| **SWE-bench** | Real-world GitHub Software Engineering | `benchmark-adapter.js` | Git Patch / Issue | Pytest / npm test execution via terminal | **READY** |
| **WebArena** | Realistic Web Environment Tasks | `benchmark-adapter.js` | Arena State JSON | URL state, DOM mutation, HTTP responses | **READY** |

---

## 2. Benchmark Registry & Task Normalization

In `matrix/evaluation/benchmark-registry.js`:
- Each benchmark is registered with its task metadata, time limits, retry budgets, scoring weights, and difficulty levels (Level 1, Level 2, Level 3).
- **Normalization Engine (`score-normalizer.js`)**: Normalizes disparate benchmark outputs to standardized 0–100 scale metrics using:
  - Linear Min-Max rescaling
  - Z-Score standardization
  - Percentile normalization
- **Wilson Confidence Intervals (`confidence-estimator.js`)**: All benchmark reporting attaches statistical confidence bounds to prevent overclaiming small sample sizes.

---

## 3. Execution Pipeline & Ingestion Flow

The `benchmark-orchestrator.js` coordinates external runs through the following verified pipeline:

```
[External Benchmark Dataset]
             │
             ▼
[Benchmark Adapter] ──> Schema Ingestion & Task Translation
             │
             ▼
[Benchmark Registry] ──> Task Metadata, Quotas & Scoring Rubrics
             │
             ▼
[Orchestrator Runner] ──> Dispatches to Matrix Agent Workforce
             │
      ┌──────┴────────────────────────┐
      ▼                               ▼
[Terminal / Tools / Browser]    [Model Router / Gemini 3.8]
      │                               │
      └──────┬────────────────────────┘
             ▼
[Outcome Verifier] ──> Dual Evidence (Output + Process State)
             │
             ▼
[Evaluation Ledger] ──> Append-only Trial Record (Cryptographic Hash)
             │
             ▼
[Report Generator] ──> Standardized Benchmark Scorecard
```

---

## 4. Host Environment Prerequisites for Live External Campaigns

To initiate live external benchmark runs against third-party public datasets:
1. **Network Connectivity:** Live access to web targets for GAIA and BrowseComp (operational).
2. **Headless Browser:** Chrome / Playwright binary installed or CDP port accessible (operational).
3. **Execution Runtime:** Node.js v20+ with PowerShell 5.1/7+ (operational).
4. **Model Credentials:** Valid Gemini API key or Anthropic/OpenAI keys for dynamic escalation (operational).
5. **Docker / Sandbox (Optional):** Required for SWE-bench execution environments.

---

## 5. Certification Sign-off

The external benchmark harness has been verified in Gate 6. All adapters compile, instantiate, and correctly process task formats. Matrix X1.1 is ready for live external benchmark campaigns.
