# AGI 0.7 — External Benchmark Adapter Architecture Report

**Document ID:** `AGI-07-BENCHMARK-ADAPTER-2026`  
**Agent Under Evaluation:** AGI 0.7  
**Runtime Interface:** Python / Node.js unified bridge via Antigravity CLI (`agy.exe`)  
**Sole Permitted Foundation Model:** `gemini-3.8-flash-high`  
**Evaluation Branch:** `feature/agi-0.7-external-evaluation`  

---

## 1. Architectural Integrity & Non-Bypass Guarantee

A critical requirement of this validation campaign is that benchmark adapters **must invoke the genuine AGI 0.7 runtime**, rather than reducing the evaluation to a bare text-completion model wrapper.

### Subsystem Preservation Matrix

| AGI 0.7 Subsystem | Implementation File | Adapter Integration Mechanism | Verification Method |
| :--- | :--- | :--- | :--- |
| **Master Orchestrator** | `agi/orchestration/master-orchestrator.js` | Embedded FSM state transitions (`IDLE` -> `PLANNING` -> `EXECUTING` -> `VERIFYING` -> `COMPLETED`). | Recorded in `EvidenceLedger` on each transition. Invalid transitions throw runtime exceptions. |
| **10-Tier Durable Memory** | `agi/memory/memory-manager.js` | Triple-scoring recall (\(0.3 \cdot \text{Recency} + 0.3 \cdot \text{Importance} + 0.4 \cdot \text{Relevance}\)) injected into system prompt; updates to `working`, `episodic`, and `semantic` tiers. | Checked via `MemorySubsystem.recall()` and atomic JSON persistence to `agi/data/memory-store.json`. |
| **Closed-World Tool Registry** | `agi/tools/tool-registry.js` | Explicit tool registration with JSON Schema parameters, strict schema validation before execution, and secret scrubbing. | Rejects unregistered tools with `TOOL_NOT_FOUND` and missing parameters with `MISSING_PARAMETER`. |
| **Computer Operation Adapter** | `agi/computer/computer-adapter.js` | Screen coordinate normalization (1920x1080 bounds) and URL domain whitelist validation. | Coordinate bounds checked; domains outside allowlist rejected. |
| **Resource Governor** | `agi/orchestration/resource-governor.js` | Real-time token tracking across input, output, and thinking tokens. Compaction trigger at 35k tokens. | Proactive compaction executes when trajectory exceeds threshold. |
| **Formal Evidence Ledger** | `agi/verification/evidence-ledger.js` | Cryptographic SHA-256 state hashing and append-only evidence stream logging. | Entries written to `agi/data/evidence-stream.jsonl`. |
| **Sole Foundation Model Policy** | `matrix/models/antigravity-provider.js` & `agi_agent_adapter.py` | Strict routing to `gemini-3.8-flash-high` via `agy.exe` with calibrated timeouts and thinking token capture. | Direct CLI invocation with JSON output parsing; zero model fallback. |

---

## 2. Benchmark-Specific Adapter Implementations

### 2.1 Sierra Research $\tau$-bench Adapter (`agi/adapters/tau_bench_adapter.py`)
- **Benchmark Source:** `sierra-research/tau2-bench` (`external/tau-bench`)
- **Domain:** Retail customer support (`MockRetailDomainEnv`, dev split)
- **Harness Integration:**
  - Extracts 16 domain tools from `env.tools_info` (`calculate`, `cancel_pending_order`, `get_order_details`, `find_user_id_by_name_zip`, etc.) and registers them dynamically in AGI 0.7's `ToolRegistry`.
  - Attaches `NonBlockingCustomerUser` simulation to simulate realistic multi-turn human conversation without stdin blocking.
  - Passes user inputs through AGI 0.7's `step()` loop, capturing structured thoughts and actions.
  - Evaluates final state using the official `env.calculate_reward()` database hash verifier.

### 2.2 OpenAI simple-evals BrowseComp Adapter (`agi/adapters/browsecomp_adapter.py`)
- **Benchmark Source:** OpenAI Simple Evals (`https://github.com/openai/simple-evals`)
- **Dataset:** `browse_comp_test_set.csv` (1,266 research tasks)
- **Harness Integration:**
  - Decrypts official canary-encrypted problem statements and answer keys via SHA-256 XOR key derivation.
  - Registers simulated web search and evidence synthesis tools in AGI 0.7's `ToolRegistry`.
  - Prompts AGI 0.7 using the official query template (`Explanation`, `Exact Answer`, `Confidence`).
  - Evaluates extracted answers using exact-match and normalized string containment against official ground-truth keys.

### 2.3 MemoryArena Multi-Session Adapter (`agi/adapters/memoryarena_adapter.py`)
- **Benchmark Source:** He et al., 2026 (`https://huggingface.co/datasets/ZexueHe/memoryarena`)
- **Domain:** Interdependent multi-session agentic tasks (`bundled_shopping`)
- **Harness Integration:**
  - Ingests sequential, interdependent multi-session episodes.
  - After each session, stores facts into AGI 0.7's 10-tier `MemorySubsystem`.
  - In subsequent sessions, retrieves prior facts using triple-scoring recall to guide decisions.
  - Evaluates accuracy across all sessions in each task trajectory.

---

## 3. Verification & Execution Readiness

All adapters have been syntax-checked and verified against their respective benchmark dependencies. The AGI 0.7 runtime maintains zero model fallback, strict parameter validation, and auditable proof recording across all evaluation runs.
