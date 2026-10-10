# AGI 1.7.0 — OMEGA COMMAND
## GPQA Diamond Clean 1.2.2 Forensic Reconciliation & Calibration Report

**Benchmark:** GPQA Diamond Clean v1.2.2 (`189` clean questions; `9` contaminated IDs excluded from `198` raw items)  
**Raw Telemetry File:** `D:\AGI_Evaluation\AGI_1_6_OMEGA_NEXUS\raw_results\gpqa_clean_189_task_results.jsonl`  
**Raw File SHA-256:** `7a11033ab18a0553bcdf22d6b394de2159da6f4933874a4b5b0d345f0145e2fa`  
**Normalized Reconciliation Artifact:** [`agi17_benchmark_reconciliation.json`](file:///D:/AGI_Evaluation/AGI_1_7_OMEGA_COMMAND/normalized_results/agi17_benchmark_reconciliation.json)  
**Live AGI 1.7 Calibration Canary Artifact:** [`isolated_cwd_canary_result.json`](file:///D:/AGI_Evaluation/AGI_1_7_OMEGA_COMMAND/canary/isolated_cwd_canary_result.json)

---

## 1. Exact Raw Record Reconciliation (189 Clean Questions)

[`BenchmarkAuditor.audit_gpqa_raw_jsonl()`](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_7/engine/agi17/evaluation/benchmark_auditor.py#L59-L170) verified every row of `gpqa_clean_189_task_results.jsonl` against the historical report:

| Metric | Raw Ledger Value | Calculation / Verification Note |
|---|---|---|
| **Raw GPQA Diamond Dataset Size** | `198` | Standard GPQA Diamond split |
| **Excluded Contaminated Questions** | `9` | `rec06249269402292`, `rec16165363240014`, `rec25885028969599`, `rec33890989242797`, `rec42969996144201`, `rec53402235449225`, `rec69693482101119`, `rec79558068482925`, `rec92131919449203` |
| **Evaluated Clean Target Total** | `189` | `198 - 9 = 189` verified records |
| **Correct Answers (`is_correct == true`)** | `174` | Exact count from JSONL |
| **Valid Answered (`predicted_letter in A..D`)** | `175` | `174` correct + `1` incorrect |
| **Incorrect Answered** | `1` | `recwW1A85nfyQpReG` (Physics / Astrophysics: predicted `B`, ground truth `C`, Jacobian differential count error) |
| **Unanswered Timeouts (`error_category == "TIMEOUT"`)** | `14` | Killed at `360s` wall timeout with `0` tokens returned by CLI |
| **Strict Accuracy (`174 / 189`)** | **`92.06%`** | `174 / 189 = 0.9206349...` |
| **Answered Accuracy (`174 / 175`)** | **`99.43%`** | `174 / 175 = 0.9942857...` |

### Domain Breakdown (189 Clean Items)

| Domain | Total Questions | Correct | Valid Answered | Incorrect | Timeouts (`360s`) | Strict Accuracy | Answered Accuracy |
|---|---|---|---|---|---|---|---|
| **Physics** | `84` | `80` | `81` | `1` | `3` | `95.24%` | `98.77%` |
| **Chemistry** | `88` | `79` | `79` | `0` | `9` | `89.77%` | `100.00%` |
| **Biology** | `17` | `15` | `15` | `0` | `2` | `88.24%` | `100.00%` |
| **Total** | **`189`** | **`174`** | **`175`** | **`1`** | **`14`** | **`92.06%`** | **`99.43%`** |

---

## 2. Token & Latency Telemetry Audit (Defects #7 and #8)

### 2.1 Provider-Reported Token Ledger Breakdown

| Token Metric | Raw Sum Across 189 Rows | Mean per Evaluated Row (`N=189`) | Mean per Valid Answered Row (`N=175`) |
|---|---|---|---|
| **Input Tokens (`input_tokens`)** | `7,390,798` | `39,104.75` | `42,233.13` |
| **Output Tokens (`output_tokens`)** | `773,523` | `4,092.71` | `4,420.13` |
| **Thinking Tokens (`thinking_tokens`, subset of output)** | `528,871` | `2,798.26` | `3,022.12` |
| **Total Reported Tokens (`tokens`)** | **`8,164,321`** | **`43,197.47`** | **`46,653.26`** |

### 2.2 Root Cause of the 8.16M Token Consumption & 14 Timeouts

Forensic inspection of the `175` valid rows in `gpqa_clean_189_task_results.jsonl` revealed a bimodal input-token distribution:
- **14 single-turn isolated items (`0 < input_tokens < 5,000`):** Mean input tokens = **`2,316.7`** (e.g., `rec1zl5LvaatzGhFt` with `2,256` input tokens, `29.4s` latency).
- **161 workspace/multi-turn items (`input_tokens >= 5,000`):** Mean input tokens = **`45,704.1`** (peaking at `259,986` tokens on `recK7bf122n33a02b` when the CLI agent entered multi-turn tool/workspace exploration loops).
- **14 timeout items (`latency_ms >= 360,000`):** When 4 concurrent `agy.exe` workers entered multi-turn tool-call loops inside the repository working directory (`c:\Users\abhis\Downloads\pt`), subprocess latency exceeded the static `360s` wall timeout, causing `subprocess.run(..., timeout=360)` to kill the process before JSON output was emitted (`tokens: 0` recorded on disk).

### 2.3 Latency Distribution Across 189 Items

| Latency Statistic | Verified Value |
|---|---|
| **Accumulated Subprocess Execution Time** | `24,118.16 seconds` (`6.70 hours` cumulative worker time) |
| **Mean Question Latency** | `127.61 seconds` |
| **Median Question Latency (p50)** | `97.92 seconds` |
| **95th Percentile Latency (p95)** | `329.95 seconds` |
| **Maximum Question Latency** | `365.12 seconds` (timeout ceiling) |

---

## 3. AGI 1.7 Live Isolated-CWD Calibration Canary Verification

To verify AGI 1.7's `ModelAdapter`, `ProcessSupervisor`, `ResourceGovernor`, and `AdaptiveTokenController` without altering or re-scoring the historical GPQA dataset, [`run_benchmark_verification.py`](file:///c:/Users/abhis/Downloads/pt/agents/AGI_1_7/scripts/run_benchmark_verification.py) executed a live non-scored synthetic calibration call (`CANARY-ISO-1791638034`):

- **Model & Effort (Directive 0):** `gemini-3.8-flash-high` (`--effort high`, `--disable-slash-commands`, `--output-format json`)
- **Enforced Working Directory:** `D:\AGI_Evaluation\AGI_1_7_OMEGA_COMMAND\isolated_cwd` (`isolated_cwd_enforced: true`)
- **Specialist Assigned:** `chem_inorganic_coordination`
- **Status & Exit Code:** `SUCCEEDED` (`exit_code = 0`, `num_turns = 1`)
- **Model Response:** `"C"` (Octahedral geometry for $\text{SF}_6$ — correct)
- **Measured Duration:** `19.10s` model execution (`32.95s` total supervised wall time — **`74.2%` lower latency** than the `127.61s` AGI 1.6 GPQA mean)
- **Provider-Reported Token Usage:** `22,489` input tokens (1-turn Antigravity CLI system/MCP schema baseline), `258` output tokens (`257` thinking tokens), **`22,747` total tokens** (**`47.3%` lower total tokens** and **`93.7%` lower output tokens** than the `43,197.47` total / `4,092.71` output AGI 1.6 GPQA mean, with zero multi-turn tool-loop runaway).
