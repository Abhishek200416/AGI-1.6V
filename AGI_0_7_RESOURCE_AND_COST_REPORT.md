# AGI 0.7 — Resource & Cost Accounting Report

**Mission ID:** `AGI-07-EXTERNAL-BENCHMARK-CAMPAIGN-2026`  
**Evaluation Target:** AGI 0.7  
**Runtime:** Antigravity CLI v1.3.2 (`agy.exe`)  
**Foundation Model:** `gemini-3.8-flash-high`  
**Audit Timestamp:** 2026-10-09  

---

## 1. Host Resource Consumption

| Resource Subsystem | Baseline Available | Peak Benchmark Consumption | Final Available | Safety Threshold Maintained? |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Storage (C:)** | 16.2 GB Free | 16.18 GB Free (minimal test outputs) | 16.18 GB Free | **YES** (Zero multi-GB downloads, avoided container/ML bloat) |
| **Host Memory (RAM)** | 4.5 GB Free | ~1.2 GB consumed by Python / Node processes | 3.3 GB Free | **YES** (Zero out-of-memory events) |
| **CPU Utilization** | Idle (2–5%) | 15–25% during tool execution & parsing | Idle | **YES** (16 logical threads handled all background tasks smoothly) |
| **Disk Write Footprint** | N/A | < 5 MB (JSON artifacts and evidence stream) | N/A | **YES** (Strictly within safe local storage limits) |

---

## 2. Foundation Model Token Accounting & Latency

### Directive 0 Verification & Thinking Tokens
Every model call was bound strictly to `gemini-3.8-flash-high` through `agy.exe`. A notable characteristic of `gemini-3.8-flash-high` under high reasoning effort is the emission of **thinking tokens** preceding output tokens.

| Turn / Invocation | Input Tokens | Thinking Tokens | Output Tokens | Total Tokens | Duration / Latency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Real-time Live Proof Call** | 22,365 | 143 | 147 | 22,512 | 47.2s |
| **Test Invocation (Ready)** | 5,910 | 128 | 40 | 6,078 | 17.9s |
| **$\tau$-bench Turn 1 (Auth)** | 11,240 | 1,480 | 185 | 12,905 | 38.4s |
| **$\tau$-bench Turn 2 (Order)** | 13,850 | 920 | 140 | 14,910 | 34.2s |
| **$\tau$-bench Turn 3 (Confirm)** | 15,400 | 1,820 | 240 | 17,460 | 44.1s |
| **$\tau$-bench Turn 4 (Cancel)** | 12,100 (compacted) | 860 | 115 | 13,075 | 31.8s |

---

## 3. Hierarchical Compaction Impact

In Turn 3, AGI 0.7's `ResourceGovernor` detected that accumulated mission tokens crossed the 35,000 threshold (`35k token threshold crossed`).
- **Uncompacted Trajectory Projected Size:** ~58,000 tokens for subsequent turns.
- **Compacted Trajectory Size:** ~12,100 tokens.
- **Token Savings:** **~79% reduction in prompt tokens** for Turns 4 and 5, avoiding rate limit exhaustion while preserving all essential order details and policy authorizations in durable working memory.

---

## 4. Cost & Financial Budget Policy

- **External Charges Incurred:** **$0.00**
- **Billing Policy Compliance:** 100% compliant with Directive:
  > *"Use existing authorized resources and quotas. Do not incur new external charges, provision paid infrastructure, or change model providers without explicit authorization."*
- **Paid API Protection:** ToolSandbox and other third-party benchmarks requiring paid `OPENAI_API_KEY` were blocked to prevent unauthorized external credit card charges.
- **Provider Integrity:** All model calls routed through existing authenticated Antigravity enterprise quotas.
