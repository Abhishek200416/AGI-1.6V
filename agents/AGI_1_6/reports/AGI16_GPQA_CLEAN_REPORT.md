# AGI_1_6 — GPQA Diamond Clean 1.2.2 Complete Benchmark Evaluation Report

**Run ID:** `EVAL-AGI16-GPQA-CLEAN-189`  
**Target Agent:** `AGI_1_6` (OMEGA NEXUS Runtime `v1.6.0`)  
**Sole Foundation Model:** `gemini-3.8-flash-high` (Directive 0 via `agy.exe`, zero silent fallback)  
**Evaluation Scope:** Complete GPQA Diamond Clean 1.2.2 (`189` Verified Questions)  
**Evaluation Date:** 2026-10-10  
**Protocol:** Closed-book, zero web search, single attempt, deterministic shuffle seed (`42 + item_idx`), independent private gold grading, bidirectional wavefront execution (`1 -> 29` & `29 -> 1`)  

---

## 1. Executive Summary & Headline Score

| Metric | Primary Strict Score (All 189 Items) | Answered-Only Score (Excluding CLI Timeouts) |
|---|---|---|
| **Exact Score** | **174 / 189** | **174 / 175** |
| **Accuracy (%)** | **92.06%** | **99.43%** |
| **95% Wilson Confidence Interval** | **[87.32%, 95.13%]** | **[96.83%, 99.90%]** |
| **Correct Predictions** | 174 | 174 |
| **Incorrect Valid Predictions** | 1 | 1 |
| **Unanswered / Infrastructure Timeouts** | 14 | 0 (excluded) |
| **Option Parsing Failures** | 0 | 0 |

---

## 2. Subject-Wise Accuracy Breakdown (Biology, Chemistry, Physics)

| Subject / Domain | Total Questions | Correct Answers | Answered Valid | Unanswered (Timeout) | Strict Accuracy (%) | 95% Wilson CI | Answered Accuracy (%) |
|---|---:|---:|---:|---:|---:|:---:|---:|
| **Biology** | 17 | **15** | 15 | 2 | **88.24%** | [65.66%, 96.71%] | **100.00%** (15/15) |
| **Chemistry** | 88 | **79** | 79 | 9 | **89.77%** | [81.69%, 94.53%] | **100.00%** (79/79) |
| **Physics** | 84 | **80** | 81 | 3 | **95.24%** | [88.39%, 98.13%] | **98.77%** (80/81) |
| **Total** | **189** | **174** | **175** | **14** | **92.06%** | **[87.32%, 95.13%]** | **99.43%** (174/175) |

### Subdomain Breakdown (All 13 Subdomains)
| Subdomain | High-Level Domain | Total | Correct | Answered | Strict Accuracy (%) | Answered Accuracy (%) |
|---|---|---:|---:|---:|---:|---:|
| Genetics | Biology | 3 | 3 | 3 | 100.00% | 100.00% |
| Molecular Biology | Biology | 14 | 12 | 12 | 85.71% | 100.00% |
| Chemistry (general) | Chemistry | 19 | 19 | 19 | 100.00% | 100.00% |
| Inorganic Chemistry | Chemistry | 1 | 1 | 1 | 100.00% | 100.00% |
| Organic Chemistry | Chemistry | 68 | 59 | 59 | 86.76% | 100.00% |
| Astrophysics | Physics | 13 | 11 | 12 | 84.62% | 91.67% |
| Condensed Matter Physics | Physics | 1 | 1 | 1 | 100.00% | 100.00% |
| Electromagnetism and Photonics | Physics | 6 | 6 | 6 | 100.00% | 100.00% |
| High-energy particle physics | Physics | 14 | 13 | 13 | 92.86% | 100.00% |
| Optics and Acoustics | Physics | 1 | 1 | 1 | 100.00% | 100.00% |
| Physics (general) | Physics | 18 | 18 | 18 | 100.00% | 100.00% |
| Quantum Mechanics | Physics | 25 | 24 | 24 | 96.00% | 100.00% |
| Relativistic Mechanics | Physics | 6 | 6 | 6 | 100.00% | 100.00% |

---

## 3. Latency & Token Consumption Telemetry
- **Mean Latency:** 127.61s (127609.3 ms)
- **Median Latency (p50):** 97.92s (97924 ms)
- **95th Percentile Latency (p95):** 329.95s (329949 ms)
- **Total Sequential Subprocess Compute Time:** 24118.2s (6.70 hours)
- **Total Tokens Consumed:** 8,164,321 tokens
  - **Input Tokens:** 7,390,798 tokens
  - **Output Tokens:** 773,523 tokens
  - **Internal Thinking / Reasoning Tokens:** 528,871 tokens
  - **Average Tokens / Question (189 items):** 43,197.5 tokens
  - **Average Tokens / Answered Question (175 items):** 46,653.3 tokens
  - **Tokens Per Correct Answer (174 items):** 46,921.4 tokens

---

## 4. Error Categorization, Unanswered Questions & Infrastructure Failures

### 4.1 Error Taxonomy Table
| Error Category | Count | Share of 189 | Description |
|---|---:|---:|---|
| **Calculation / Jacobian Change-of-Variables Error** | 1 | 0.53% | Answer parsed cleanly (`<choice>B</choice>`) but omitted differential parallax-to-distance Jacobian factor $\|d\text{plx}/dr\| = r^{-2}$ on `recwW1A85nfyQpReG` |
| **Conceptual Science Error** | 0 | 0.00% | Zero conceptual failures among answered items |
| **Misunderstood Question** | 0 | 0.00% | Zero question misinterpretations |
| **Option Parsing Error** | 0 | 0.00% | 100% of completed responses emitted valid `<choice>A-D</choice>` tags |
| **Timeout / Infrastructure Failure (Unanswered)** | 14 | 7.41% | Model CLI subprocess exceeded timeout ceiling (180s/240s/360s) under parallel wave contention |

### 4.2 Detailed Audit of the Single Incorrect Answered Question (`1 / 175`)
- **Item Index:** `183` (Question `184/189`) | **Record ID:** `recwW1A85nfyQpReG`
- **Domain / Subdomain:** Physics / Astrophysics
- **Predicted Option:** `B` ($\sim r^4$) | **Authorized Gold Option:** `C` ($\sim r^3$)
- **Latency & Tokens:** `77.2 s`, `70,980` tokens
- **Root Cause:** Given that observed star counts vary with parallax as $1/\text{plx}^5$, the model treated $N(\text{plx}) \propto \text{plx}^{-5} \propto r^5$ as cumulative and differentiated once with respect to $r$ to obtain $dN/dr \propto r^4$ (`B`). Under the differential parallax density convention $dN/d\text{plx} \propto \text{plx}^{-5}$, applying the Jacobian transformation $dN/dr = (dN/d\text{plx})\|d\text{plx}/dr\| \propto r^5 \cdot r^{-2} = r^3$ yields `C`.

### 4.3 Separate Log of All 14 Unanswered / Infrastructure Timeout Items
| # | Item Index | Record ID | Domain | Subdomain | Gold Key | Timeout Ceiling | Error Detail |
|---:|---:|---|---|---|:---:|---:|---|
| 1 | 10 | `rec4L69T0Y1AS4AFS` | Biology | Molecular Biology | `C` | 181.6s | `Model execution timed out after 180s` |
| 2 | 12 | `rec4r4KWNLrT7g2kR` | Chemistry | Organic Chemistry | `A` | 181.5s | `Model execution timed out after 180s` |
| 3 | 15 | `rec5rjeLsEq5Fg7Oj` | Chemistry | Organic Chemistry | `D` | 181.8s | `Model execution timed out after 180s` |
| 4 | 17 | `rec8nshandHARTkrg` | Chemistry | Organic Chemistry | `C` | 181.4s | `Model execution timed out after 180s` |
| 5 | 30 | `recDytVnNYZe2HuUU` | Physics | High-energy particle physics | `D` | 244.3s | `Model execution timed out after 240s` |
| 6 | 32 | `recFaL6j8UMhutXrc` | Chemistry | Organic Chemistry | `D` | 244.3s | `Model execution timed out after 240s` |
| 7 | 60 | `recOYsaYs6RmtlTDy` | Physics | Quantum Mechanics | `A` | 364.5s | `Model execution timed out after 360s` |
| 8 | 86 | `recZWeueB7lSPR6wN` | Chemistry | Organic Chemistry | `A` | 364.6s | `Model execution timed out after 360s` |
| 9 | 103 | `recgXxEgllSGEpELP` | Physics | Astrophysics | `B` | 364.4s | `Model execution timed out after 360s` |
| 10 | 111 | `reck4G4xxv3YnpbtQ` | Chemistry | Organic Chemistry | `C` | 364.6s | `Model execution timed out after 360s` |
| 11 | 120 | `recnTTKdBzfuoZ7w7` | Biology | Molecular Biology | `D` | 361.4s | `Model execution timed out after 360s` |
| 12 | 138 | `rectlyG9pCAAuWhoB` | Chemistry | Organic Chemistry | `C` | 361.4s | `Model execution timed out after 360s` |
| 13 | 161 | `recGee5m84dg5FZkc` | Chemistry | Organic Chemistry | `D` | 361.4s | `Model execution timed out after 360s` |
| 14 | 174 | `recYCMJWH7IpcdqwE` | Chemistry | Organic Chemistry | `B` | 365.1s | `Model execution timed out after 360s` |

---

## 5. Dataset Provenance, Version Verification & Leakage Controls
- **Source Dataset:** `https://github.com/idavidrein/gpqa` (Authorized local GPQA Diamond CSV, `198` items)
- **Source CSV SHA-256:** `41d1213cd7a4998605a26c2798500652572007161b3a92817ba46b35befcd305`
- **Clean Exclusion Overlay:** `https://github.com/adamallcock/gpqa-diamond-clean` (`v1.2.2`)
- **Exclusions Manifest SHA-256:** `d51f84fe1df413b062b3ce1b8c7f93ecd1f29484711e9019bdd1d019c25292a5`
- **Excluded Record IDs (9 removed):** `rec7qmSnbud4FHSqL, recAYkd96NNuNl1Ei, recLAgwx9vbgB5EHk, recQiWOxhkXRz9NVE, recUOePh79cp4T2Bg, recclFbsjbaiVVnnV, recf6ayQmL1SxKbvW, recihePFulRgNKsIn, reczzzihL7btBH7RO`
- **Cleaned Dataset (`cleaned.jsonl`):** Exactly `189` verified unique questions
- **Cleaned JSONL SHA-256:** `c04c551a71da14d802841ec1a5dd3aa83fbcbe22e89b4cd6c6aef3c690c00e8d`
- **Official Build & Self-Check Verification:**
  - `scripts/build.py`: `OK: source 198 -> cleaned 189 (removed 9/9 exclusion ids)` (Exit Code `0`)
  - `scripts/verify.py`: `OK: gpqa-diamond-clean v1.2.2 -- exclusions, manifest, cleaned.jsonl consistent` (Exit Code `0`)
- **Option Permutation Seed:** `seed = 42 + item_idx`
- **Scoring Isolation:** Evaluator graded predictions strictly against private gold answer key (`gpqa_clean_gold_key.json`); candidate CSV (`gpqa_clean_results.csv`) contains zero gold answers.
