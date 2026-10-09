# AGI 0.7 — External Benchmarking & Independent Validation Campaign Plan

**Mission ID:** `AGI-07-EXTERNAL-BENCHMARK-CAMPAIGN-2026`  
**Agent Under Evaluation:** AGI 0.7  
**Assumed Historical Baseline:** MATRIX X1.2  
**Development Branch:** `feature/agi-0.7` (Release commit: `945daab`)  
**Evaluation Branch:** `feature/agi-0.7-external-evaluation`  
**Baseline Commit:** `0940c23` (`chore(matrix-x1.2): preserve MATRIX X1.2 benchmark results, controlled comparison and audit artifacts`)  
**Sole Permitted Foundation Model:** `gemini-3.8-flash-high`  
**Execution Runtime:** Antigravity CLI v1.3.2 (`%LOCALAPPDATA%\agy\bin\agy.exe`)  
**Evaluation Date:** 2026-10-09  

---

## 1. Executive Mission & Primary Objective

The primary objective of this campaign is to subject **AGI 0.7** to rigorous, empirical external evaluation across the broadest feasible set of genuine agent benchmarks. Internal acceptance suites (54/54 tests) provide regression proof of module mechanics, but genuine real-world autonomous capability requires independent validation against recognized external agent standards.

### Core Directives
1. **Directive 0 (Sole Foundation Model):** Every model invocation must strictly use `gemini-3.8-flash-high` via the verified Antigravity runtime with calibrated timeouts (60–120s) and thinking token extraction. Zero silent fallbacks to lower effort tiers or alternative model families.
2. **Ponytail Senior Dev Principle:** Minimal necessary code, deletion over addition, root-cause fixes, no unrequested boilerplate or speculative abstractions, and one runnable check left behind.
3. **No Fabricated Benchmarks:** Every evaluated task must originate from authentic benchmark harnesses or datasets. No synthetic replacements labeled as official. Benchmarks blocked by environment or resource constraints must be explicitly marked `BLOCKED` with precise technical diagnostics.
4. **Controlled Paired Baseline:** Comparisons against MATRIX X1.2 must use identical task subsets, identical model policies (`gemini-3.8-flash-high`), identical prompt context, and identical state verifiers.
5. **Full Architecture Preservation:** Benchmark adapters must route through AGI 0.7's authentic runtime—including FSM master orchestration, 10-tier durable memory, closed-world tool validation, resource governance, and evidence recording—rather than substituting a bare model wrapper.

---

## 2. Multi-Tier Benchmark Evaluation Matrix

| Tier | Benchmark Suite | Official Source | Core Capability Tested | Feasibility Status | Diagnostic Reason / Route |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tier 0** | Internal Regression Suites | `.agents/v4`, `matrix/`, `agi/` | Unit, FSM, and architectural integrity | `VERIFIED` | 54/54 tests pass; Test 3 audited as static proof check. |
| **Tier 1** | Terminal-Bench 2.0 | `harbor-framework/terminal-bench-2` | Terminal pty, shell execution, repo repairs | `BLOCKED` | Docker daemon stopped; WSL access denied. |
| **Tier 2** | SWE-bench Pro V2 | `scaleapi/SWE-bench_Pro-os` | Enterprise software engineering & patching | `BLOCKED` | Docker container execution environment unavailable. |
| **Tier 3** | BrowserGym / AgentLab | `ServiceNow/BrowserGym` | Web navigation & multi-page workflows | `BLOCKED` | 122 heavyweight dependencies, WebArena Docker blocked. |
| **Tier 4** | OSWorld 2.0 | `Levelower/OSWorld-2.0` | Desktop GUI computer-use interaction | `BLOCKED` | Virtualized OS guest / QEMU sandbox missing. |
| **Tier 5** | $\tau$-bench (Tau-Bench) | `sierra-research/tau2-bench` | Multi-turn stateful tools, policy & DB hash | `EXECUTABLE` | Operational in `.venv`; authentic mock retail domain. |
| **Tier 6** | ToolSandbox | `apple-aiml-research/ToolSandbox` | Stateful tool DAGs & milestone assertions | `BLOCKED` | User simulator requires paid `OPENAI_API_KEY`. |
| **Tier 7** | TheAgentCompany | `TheAgentCompany/TheAgentCompany` | Digital worker enterprise tasks (GitLab/Chat) | `BLOCKED` | Requires 30+ GB disk (16.2 GB free) & Docker Compose. |
| **Tier 8** | BrowseComp | `openai/simple-evals` (BrowseComp) | Complex multi-step web research synthesis | `EXECUTABLE` | 1,266 official tasks accessible; offline grader ready. |
| **Tier 9** | GAIA | `huggingface.co/datasets/gaia-benchmark/GAIA` | Multimodal general AI assistant tasks | `BLOCKED` | HF gated dataset; `HF_TOKEN` not configured. |
| **Tier 10**| MemoryArena | `ZexueHe/memoryarena` | Interdependent multi-session agentic memory | `EXECUTABLE` | Public dataset accessible; 10-tier memory evaluatable. |
| **Tier 11**| MLE-bench | `openai/mle-bench` | Machine learning engineering competitions | `BLOCKED` | Requires GPU training cluster & 12-24h long runs. |

---

## 3. Phased Execution Roadmap

### Phase 1: Environment & Baseline Audit (Complete)
- Inspect git status, verify branch `feature/agi-0.7` and release commit `945daab`.
- Create isolated evaluation branch `feature/agi-0.7-external-evaluation`.
- Re-run all 54 internal tests and capture raw execution logs.
- Audit the zero-ms live model verification check in `agi/tests/acceptance-suite.js` (Test 3) and execute an authentic real-time call to `gemini-3.8-flash-high` via `agy.exe`.
- Perform preflight audit of CPU, RAM, disk space, Docker, WSL, Python, Node, and uv.

### Phase 2: AGI 0.7 Benchmark Adapter Construction
- Implement `agi/adapters/agi_runtime_bridge.js` uniting `MasterOrchestrator`, `MemoryManager`, `ToolRegistry`, `ResourceGovernor`, and `EvidenceLedger`.
- Ensure tool calls are executed through closed-world parameter validation with OWASP secret scrubbing.
- Preserve deterministic FSM lifecycle transitions: `IDLE` -> `PLANNING` -> `EXECUTING` -> `VERIFYING` -> `COMPLETED`.

### Phase 3: Executable Benchmark Execution & Pilot Validations
- **$\tau$-bench Pilot & Expansion:** Run authentic multi-turn retail domain tasks with state-hash verification using official Sierra Research `calculate_reward()`.
- **BrowseComp Pilot:** Run authentic multi-step web research questions from OpenAI `simple-evals`, utilizing AGI 0.7's `ComputerAdapter` and reasoning loop.
- **MemoryArena Pilot:** Run interdependent multi-session tasks testing whether AGI 0.7's 10-tier `MemoryManager` retains cross-session facts compared to stateless or baseline agents.

### Phase 4: Controlled Baseline Comparison
- Evaluate identical task subsets between **AGI 0.7** and **MATRIX X1.2**.
- Measure success rate, tool call efficiency, token usage, latency, and state verification accuracy.

### Phase 5: Security, Failure Analysis & Evidence Ledger Finalization
- Audit OWASP MCP security, command injection resistance, and path containment during benchmark execution.
- Categorize failure modes (trajectory drift, policy over-adherence, tool parameter hallucination).
- Compile all required artifacts and issue the final Release Verdict.
