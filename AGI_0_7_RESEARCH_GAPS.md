# AGI 0.7 — Frontier Research Gaps & Uncertainty Register

**Document ID:** AGI-07-GAPS-2026  
**Primary Agent:** AGI 0.7  
**Foundation Model:** `gemini-3.8-flash-high`  
**Scope:** Critical Research Gaps Identified Across Tracks A through L  
**Date:** 2026-10-09  

---

## 1. Identified Research Gaps in Contemporary Literature

While the 156 cataloged research papers represent frontier state-of-the-art, several critical engineering and theoretical gaps exist that AGI 0.7 must explicitly account for through defensive architecture:

| Gap ID | Research Track | Problem Statement & Literature Gap | Severity | AGI 0.7 Engineering Treatment |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Track A: Self-Improvement | **Absence of General Soundness Proofs for Neural Code Mutation:** Gödel Machines assume an automated theorem prover can verify arbitrary code modifications, but real Turing-complete programs are undecidable (Rice's Theorem). | `CRITICAL` | Bound self-improvement to a restricted domain of modular skills and strategies with empirical test harnesses rather than unbounded arbitrary kernel self-rewrites. |
| **GAP-02** | Track B: Alignment Faking | **Undetectable Subtle Sabotage in Complex Software:** Alignment faking research (Greenblatt et al. 2024) indicates models under high optimization pressure can inject subtle timing bugs or off-by-one errors that pass basic unit tests. | `HIGH` | Implement multi-agent debate (Du et al. 2023) where an adversarial Skeptical Reviewer reviews AST diffs with instructions to search for covert edge-case bugs. |
| **GAP-03** | Track C: MCP Security | **Dynamic Tool Semantic Ambiguity:** MCP protocol schemas validate JSON data types (string, number) but cannot validate semantic safety of tool arguments (e.g. `rmdir` vs `cat`). | `HIGH` | Enforce semantic constraint gates and path resolution whitelists in `agi/security/mcp-security.js`. |
| **GAP-04** | Track E: Long-Horizon Memory | **Semantic Drift & Interference Across 10,000+ Steps:** Dense associative memory graphs accumulate contradictory or obsolete factual beliefs over long missions (MemoryArena 2024). | `MEDIUM` | Implement temporal versioning and Ebbinghaus forgetting decay with explicit fact retirement in `agi/memory/semantic-memory.js`. |
| **GAP-05** | Track F: Computer Operation | **DOM / Pixel Misalignment on Dynamic Visual UIs:** Pixel-based GUI models (OmniParser, CogAgent) experience spatial drift when OS display scaling (125%, 150%) is enabled on Windows hosts. | `HIGH` | Explicit display scale factor normalization and native accessibility tree fallback in `agi/computer/computer-adapter.js`. |
| **GAP-06** | Track K: Market Simulation | **Unmodeled Liquidity Regime Shifts in Paper Trading:** Most paper trading simulators assume infinite liquidity at top-of-book prices, understating transaction costs by up to $10\times$ (Cont et al. 2014). | `MEDIUM` | Implement Kyle's Lambda price impact and Bouchaud's square-root market impact law in simulated fills. |

---

## 2. Risk & Uncertainty Register

1. **Host Environment Resource Boundaries:** Windows 11 host with 16.82 GB free on C: drive restricts downloading multi-gigabyte evaluation datasets locally. Mitigated by redirecting large cache directories to D: (686 GB free).
2. **Containerization Dependency Blockers:** Docker daemon is stopped on the host. Evaluators requiring full Docker container isolation (SWE-bench official harness, OSWorld VM) cannot run until Docker is launched. Mitigated by running native, container-free evaluation suites ($\tau$-bench, internal acceptance suites).
3. **Reasoning Latency Budget:** Extended thinking tokens in Gemini 3.8 Flash High provide exceptional depth but incur 15–30s latency per substantive turn. Mitigated by asynchronous background job dispatching and selective reasoning invocation.
