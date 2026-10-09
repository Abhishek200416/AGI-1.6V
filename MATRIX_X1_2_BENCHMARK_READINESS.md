# MATRIX X1.2 — BENCHMARK READINESS AUDIT & FEASIBILITY MATRIX

**Document ID:** `MATRIX-X12-BENCHMARK-READINESS-2026`  
**Host Platform:** Windows 11 Pro x64 (`win32 10.0.26220 x64`)  
**Hardware Profile:** 16-core Intel Core i5-1240P | 15.70 GB Total RAM (5.36 GB Free)  
**Storage Profile:** Drive C: 16.82 GB Free | Drive D: 686.4 GB Free  
**Audit Date:** October 9, 2026  
**Primary Agent:** MATRIX X1.2  
**Sole Foundation Model:** `gemini-3.8-flash-high`  
**Standard:** Empirical Feasibility, Zero-Cost Verification, Anti-Fabrication Standard

---

## 1. Host Infrastructure & Toolchain Inventory

| Category | Component / Tool | Detected Version / Status | Host Path / Location | Operational Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | `v20.20.2` | `C:\Program Files\nodejs\node.exe` | **READY** |
| **Package Manager** | npm | `10.8.2` | `C:\Program Files\nodejs\npm.cmd` | **READY** |
| **Python Virtualenv** | CPython (.venv) | `3.14.6` | `.venv\Scripts\python.exe` | **READY** |
| **Python Tool** | uv | `0.11.21` | `C:\Users\abhis\.local\bin\uv.exe` | **READY** |
| **VCS** | Git for Windows | `2.52.0.windows.1` | `C:\Program Files\Git\cmd\git.exe` | **READY** |
| **Browser Engine** | Playwright / Chromium | `1.63.0` | Global cache | **READY** |
| **Antigravity CLI** | `agy.exe` | `1.3.2` | `C:\Users\abhis\AppData\Local\agy\bin\agy.exe` | **AUTHENTICATED / READY** |
| **Sole Model** | `gemini-3.8-flash-high` | Active Authenticated Model | Antigravity CLI Model Router | **VERIFIED OPERATIONAL** |
| **Container Engine** | Docker CLI | `29.2.0` | `C:\Program Files\Docker\Docker\resources\bin\docker.exe` | **CLI PRESENT, DAEMON STOPPED** |
| **WSL2** | WSL2 Subsystem | `docker-desktop` | WSL2 Subsystem | **STATE: STOPPED** |
| **Hardware GPU** | Intel Iris Xe Graphics | Integrated 12th Gen | Host Direct3D / OpenCL | **ADEQUATE FOR AGENT LOOPS** |

---

## 2. 6-Tier Benchmark Feasibility Matrix (13 Frontier Families)

| Feasibility Category | Benchmark Name | Exact Technical Reason / Blocker | Prerequisites to Execute |
| :--- | :--- | :--- | :--- |
| **`RUNNABLE_NOW`** | **τ-bench (tau-bench)** | Upstream repository cloned (`external/tau-bench`); Python dependencies installed in `.venv`; runs natively on Windows bare-metal without Docker; official database SHA-256 hash grader (`calculate_reward`) is pure Python. | None. Fully operational right now. |
| **`RUNNABLE_NOW`** | **BrowseComp** | Playwright Chromium browser engine installed; web retrieval runnable via Node.js / Playwright. | Open web research questions. |
| **`RUNNABLE_AFTER_SETUP`** | **AppWorld** | Pure Python execution with SQLite backend; supports Windows; requires package install and test database setup. | Install `appworld` via uv pip into `.venv`. |
| **`RUNNABLE_AFTER_SETUP`** | **ToolQA / ToolBench** | Python evaluation harness; mock API cache servers can run on Windows. | Download ToolBench cache files. |
| **`RUNNABLE_AFTER_SETUP`** | **AgentBench (DB/KG)** | SQL and Knowledge Graph environments run in native Python on Windows. | Download DB/KG datasets. |
| **`BLOCKED_HOST_ENVIRONMENT`** | **SWE-bench (Verified/Lite)**| Requires active Linux Docker daemon (`dockerd`) to spin up per-task Python testbed containers with pre-installed build tools and repo environments. | Start Docker Desktop with WSL2 Linux engine; requires >50GB disk on Drive D. |
| **`BLOCKED_HOST_ENVIRONMENT`** | **Terminal-Bench 4.0 (Harbor)**| Official Harbor tasks require Docker daemon to start task environment containers (`harbor task start-env`). | Start Docker daemon on host. |
| **`BLOCKED_HOST_ENVIRONMENT`** | **OSWorld 2.0** | Requires Ubuntu Linux VM with X11/Wayland display server and nested virtualization (KVM/QEMU) for GUI desktop manipulation. | Provision Ubuntu Linux VM with nested virtualization. |
| **`BLOCKED_HOST_ENVIRONMENT`** | **DeepSWE** | Requires Linux container runner for multi-repo compilation. | Deploy Linux build container runner. |
| **`BLOCKED_HOST_INFRASTRUCTURE`**| **WebArena-Verified Hard**| Requires self-hosting 4 Docker web services simultaneously (GitLab, Shopping, Reddit, Maps); requires 32 GB RAM (host has 15.7 GB RAM). | Deploy on dedicated 32GB+ Linux server. |
| **`BLOCKED_HOST_INFRASTRUCTURE`**| **TheAgentCompany** | Requires multi-container corporate enterprise stack running simulated enterprise services. | Deploy corporate Docker Compose stack. |
| **`BLOCKED_ACCESS_KEY`** | **GAIA (Validation Set)** | Parquet metadata and task files on HuggingFace require an authenticated user token (`HTTP 401 Unauthorized` on unauthenticated requests). | HuggingFace user login token (`HF_TOKEN`). |
| **`REQUIRES_AUTHORIZATION`** | **Humanity's Last Exam (HLE)**| Official evaluation dataset is canary-locked (`hle:canary:...`) and requires blind submission to CAIS portal. | CAIS institutional portal credentials. |
| **`REQUIRES_AUTHORIZATION`** | **SWE-bench Pro** | Enterprise codebase evaluation dataset requires Scale AI authorization tokens. | Scale AI research credentials. |
| **`REQUIRES_AUTHORIZATION`** | **MLE-bench** | Requires high-performance NVIDIA A100 GPU cluster and Kaggle API authorization. | Attach GPU cloud cluster and Kaggle API key. |
| **`INTERNAL_EVALUATION`** | **METR Time Horizon** | Official METR tasks are restricted; multi-step survival protocol can run as an internal test. | None (Explicitly labeled internal). |

---

## 3. Primary Official Benchmark Selection: τ-bench (tau-bench)

### 3.1 Scientific Rationale
**τ-bench** is selected as the primary official upstream benchmark for the following definitive reasons:
1. **Defensible Scientific Validity:** Created by Sierra Research (2024/2025), τ-bench is the premier frontier benchmark for evaluating real-world tool-agent-user reliability under complex business policies.
2. **Authentic Upstream Source:** Cloned directly from `https://github.com/sierra-research/tau-bench` (Commit `69e909565f0e9b9cf9cb3db7b678c1a7924345f1`). No synthetic rewriting.
3. **Objective Deterministic Grader:** Evaluation does not rely on LLM-as-a-judge subjectivity. It uses `calculate_reward()`, which executes the agent's tool sequence on a pristine database clone and computes a SHA-256 hash diff (`data_hash == gt_data_hash`). If the database state differs by even one field, reward is strictly 0.0.
4. **Zero Infrastructure Blockers:** Operates completely in pure Python on Windows bare-metal without requiring a Docker daemon, VM, or GPU.
5. **Zero Financial Cost:** Runs locally with existing authenticated `agy.exe` inference using `gemini-3.8-flash-high` at **$0.00 marginal cost**.

### 3.2 Integration Architecture
```
┌────────────────────────────────────────────────────────────────────────┐
│                        MATRIX X1.2 AGENT LOOP                          │
│                                                                        │
│   Mission Compiler ──> Adaptive Execution Controller (FSM)             │
│                                   │                                    │
│                                   ▼                                    │
│   Model Router ──> Antigravity Provider (`agy.exe`)                   │
│                    Sole Model: `gemini-3.8-flash-high`                 │
│                                   │                                    │
│                                   ▼                                    │
│   Tool Router ──> tau-bench Tool Dispatcher                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Tool Invocations
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 OFFICIAL SIERRA RESEARCH TAU-BENCH                     │
│                                                                        │
│   MockRetailDomainEnv (`external/tau-bench/tau_bench/envs/retail`)      │
│   - Tasks: `tasks_dev.py` (Official Development Split)                 │
│   - Domain Rules: `rules.py` (Cancellation, Return, Exchange policies) │
│   - Tool implementations: `tau_bench/envs/retail/tools/`               │
│   - State DB: In-memory relational database (`data.py`)                │
│                                                                        │
│   OFFICIAL GRADER:                                                     │
│   `calculate_reward()`:                                                │
│   1. Compares agent DB state SHA-256 vs ground truth DB SHA-256        │
│   2. Verifies communicative output assertions                          │
│   3. Returns Reward: 1.0 (PASS) or 0.0 (FAIL)                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Execution Guardrails & Resource Bounds

1. **Model Enforcement (Directive 0):** Every reasoning turn must call `gemini-3.8-flash-high` via `agy.exe`. If the model is unresponsive, the task halts immediately.
2. **Turn Limit:** Maximum 10 turns per task to prevent infinite loops.
3. **Execution Timeout:** 60 seconds per model call via `antigravity-provider.js`.
4. **State Isolation:** Pristine database cloned before each task run (`env.reset()`).
5. **Logging:** Full raw transcripts, model responses, tool arguments, database SHA-256 hashes, and grader verdicts persisted to disk.
