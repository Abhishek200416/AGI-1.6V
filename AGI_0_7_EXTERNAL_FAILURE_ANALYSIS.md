# AGI 0.7 — External Benchmark Failure Analysis & Weakness Catalog

**Mission ID:** `AGI-07-EXTERNAL-BENCHMARK-CAMPAIGN-2026`  
**Evaluation Target:** AGI 0.7  
**Analysis Date:** 2026-10-09  
**Policy:** Transparent, empirical cataloging of all failures, discrepancies, and environmental ceilings without concealment.

---

## 1. Executive Summary

A core mandate of this independent validation campaign is to identify genuine weaknesses, failure modes, and boundaries in AGI 0.7. Rather than presenting an idealized synthetic 100% pass claim, this report systematically catalogs the real-world failure cases, environmental blockers, and evaluation discrepancies encountered across the multi-tier benchmark campaign.

---

## 2. Empirical Failure Classifications

### Failure Mode 1: Canonicalization & Surface-Form Formatting Mismatch (BrowseComp Task #0)
- **Benchmark:** OpenAI `simple-evals` BrowseComp
- **Task ID / Topic:** Task #0 (`Art` / African Author active dates)
- **Agent Prediction:** `1988–1996` (Latency: 76.4s, Thinking tokens: 3,340)
- **Dataset Reference Key:** `1988-96`
- **Evaluator Outcome:** `INCORRECT`
- **Root Cause Analysis:**
  - The agent performed deep, accurate factual synthesis, identifying the correct author and the exact active years from 1988 to 1996.
  - However, the agent formatted the date span as a four-digit range with an en-dash (`1988–1996`), whereas the ground-truth answer key stored the abbreviated colloquial two-digit span (`1988-96`).
  - Standard exact-match string evaluation fails on this surface-form mismatch despite semantic and factual correctness.
- **Remediation & Architecture Upgrade:**
  - Integrate an answer canonicalization pass in `AGI07Agent` that maps common date formats (e.g., `YYYY-YYYY` -> `YYYY-YY`) and trims punctuation variations before final answer emission.

---

### Failure Mode 2: Multi-Turn Token Inflation & Wall-Clock Latency
- **Benchmark:** Sierra Research $\tau$-bench (Task DEV-0)
- **Empirical Observation:**
  - Total tokens: **84,223 tokens** across 5 turns.
  - Thinking tokens: **11,558 tokens** (13.7% of total volume).
  - Total latency: **267,661ms (~4.4 minutes)**.
- **Root Cause Analysis:**
  - `gemini-3.8-flash-high` engages in thorough chain-of-thought deliberation, generating 1,400 to 2,800 thinking tokens per turn before outputting its tool call JSON.
  - While this ensures high policy compliance (e.g. authenticating before fetching order, explaining refund terms before cancellation), it incurs significant latency compared to lighter models.
  - Furthermore, AGI 0.7 appended an additional polite customer closing turn, extending the trajectory from 4 turns (MATRIX X1.2) to 5 turns.
- **Remediation:**
  - Optimize the conversation loop to exit immediately once the primary user goal is verified and completed, eliminating redundant conversational pleasantries.

---

### Failure Mode 3: Container Runtime Dependency (Terminal-Bench 2.0 & SWE-bench Pro V2)
- **Benchmarks Affected:** Terminal-Bench 2.0 (Harbor), SWE-bench Pro V2
- **Failure Classification:** `BLOCKED_BY_ENVIRONMENT`
- **Root Cause Analysis:**
  - Official harnesses require a running Docker daemon on Linux/WSL2 to launch isolated bash/pty execution containers and repo test environments.
  - On the host Windows machine, Docker Desktop service was in a `Stopped` state and WSL access was denied (`Wsl/E_ACCESSDENIED`).
  - Attempting to start the service without admin elevation failed silently.
- **Remediation:**
  - Requires host infrastructure configuration: administrative Docker startup and WSL2 user group membership.

---

### Failure Mode 4: Heavyweight Machine Learning Dependency Footprint (BrowserGym)
- **Benchmark Affected:** BrowserGym / AgentLab
- **Failure Classification:** `BLOCKED_BY_RESOURCES`
- **Root Cause Analysis:**
  - Dry-run package resolution indicated 122 package dependencies including PyTorch (`torch==2.14.1`), `transformers`, `scipy`, and `pandas` (~4-6 GB download, ~10 GB disk footprint).
  - Primary C: drive has 16.2 GB free space, making full installation dangerous to host stability.
  - In addition, WebArena requires Docker containers to host target web apps.
- **Remediation:**
  - Use lightweight headless browser automation directly through AGI 0.7's native `ComputerAdapter` and Antigravity Playwright tools rather than monolithic ML gym frameworks.

---

### Failure Mode 5: Third-Party Paid Model Exclusivity (ToolSandbox)
- **Benchmark Affected:** ToolSandbox (Apple Research)
- **Failure Classification:** `BLOCKED_BY_PAID_DEPENDENCY`
- **Root Cause Analysis:**
  - ToolSandbox hardcodes its user simulator to require `OPENAI_API_KEY` (`GPT_3_5_0125` or `GPT_4_0125`).
  - Executing this benchmark would violate Directive 0 (sole foundation model `gemini-3.8-flash-high`) and the Budget Policy forbidding external paid charges.
- **Remediation:**
  - Create a vendor-neutral user simulator adapter for ToolSandbox allowing `gemini-3.8-flash-high` to power the user simulator.

---

### Failure Mode 6: Gated Access Restrictions (GAIA)
- **Benchmark Affected:** GAIA
- **Failure Classification:** `BLOCKED_BY_GATED_AUTH`
- **Root Cause Analysis:**
  - Hugging Face dataset is gated (`gated: auto`), requiring user terms acceptance and an approved `HF_TOKEN`.
  - In strict compliance with safety directives, unauthenticated scraping or hidden answer extraction was prohibited.

---

## 3. Summary of Failure Catalog

| Failure Class | Frequency | Severity | Agent Architecture Impact |
| :--- | :---: | :---: | :--- |
| **Surface-Form Mismatch** | 1 observed (BrowseComp #0) | Low (Factual accuracy high) | Add answer canonicalization layer |
| **Thinking Token Latency** | Systematic across all turns | Medium (Operational delay) | Calibrate thinking effort / token budget |
| **Host Docker Dependency** | 3 benchmark suites blocked | High (Prevents container benchmarks) | Requires host admin setup |
| **Heavyweight ML Footprint** | 1 benchmark suite blocked | Medium (Disk constraint) | Prefer native tool bridges over multi-GB ML gyms |
| **Paid Third-Party API Lock** | 1 benchmark suite blocked | High (Contractual/budget block) | Requires open-source simulator adapters |
| **HF Gated Access** | 1 benchmark suite blocked | Medium (Access credential block) | Requires authorized HF token |
