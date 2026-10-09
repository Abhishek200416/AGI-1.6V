# MATRIX X1.2 — OFFICIAL FRONTIER BENCHMARK MANIFEST
## Evaluation Catalog, Environment Requirements, and Execution Status

**Document Identifier:** `MANIFEST-BENCH-X1.2-20261009`  
**Target System:** MATRIX X1.2  
**Sole Evaluated Model:** Gemini 3.8 Flash High (`gemini-3.8-flash-high`)  
**Truth Standard:** Zero-Fabrication, Evidence-Backed, Strict Status Categorization  

---

## 1. Truth Standard Status Classifications

Every benchmark track in this manifest is strictly classified into one of the following official statuses:
- **`OFFICIAL_FULL_RUN`:** Complete official test suite executed end-to-end via official grading harness.
- **`OFFICIAL_SUBSET_EXECUTED`:** Official benchmark task set subset executed locally in native environment with official verification criteria.
- **`INTERNAL_EVALUATION`:** Proxy or held-out capability tasks inspired by the benchmark methodology, explicitly labeled as internal.
- **`BLOCKED (ENVIRONMENT)`:** Official runner requires external infrastructure not present on current host (e.g. Linux Docker daemon, QEMU VM).
- **`BLOCKED (CREDENTIAL/GATE)`:** Requires external competition credentials, gated HuggingFace tokens, or proprietary access.
- **`UNVERIFIED`:** Task execution recorded without official grader certification.

---

## 2. Priority 1: Software Engineering & Terminal

### 1. Terminal-Bench 4.0
- **Official Version:** 4.0 (Latest Release)
- **Domain:** Real terminal operations, shell pipelines, environment troubleshooting, process inspection.
- **Runtime Environment:** Windows PowerShell & Node.js host terminal.
- **Status:** **`OFFICIAL_SUBSET_EXECUTED`** (5 Tasks executed in `matrix/tests/terminal-bench-live-subset.js`).
- **Official Grader Criteria:** Exact exit code 0, regex match on stdout/stderr, filesystem artifact existence, and state persistence.

### 2. SWE-bench Verified
- **Official Version:** Verified Split (500 curated human-validated GitHub issues).
- **Domain:** Real-world Python repository bug fixing and test suite pass/fail validation.
- **Runtime Environment:** Docker Linux container daemon with pre-built conda environments.
- **Status:** **`BLOCKED (DOCKER_LINUX_DAEMON)`**
- **Blocker Details:** Host is Windows desktop without active Linux Docker daemon required to build upstream Python repos (`django`, `sympy`, `scikit-learn`).

### 3. SWE-bench Pro V2 (including HARD-51)
- **Official Version:** Pro V2 (Private/commercial split) + HARD-51 high-complexity tasks.
- **Domain:** Complex multi-repo enterprise software engineering challenges.
- **Runtime Environment:** Cloud VM sandbox with private grader.
- **Status:** **`BLOCKED (PROPRIETARY_ACCESS)`**
- **Blocker Details:** Gated enterprise benchmark requiring commercial platform submission.

### 4. DeepSWE
- **Official Version:** 2025.1
- **Domain:** Autonomous pull request authoring and test pass validation.
- **Runtime Environment:** Cloud GitHub Actions runner with Docker container.
- **Status:** **`BLOCKED (DOCKER_DAEMON)`**
- **Blocker Details:** Requires headless Linux Docker environment with network bridge.

---

## 3. Priority 2: Browser & Information Retrieval

### 5. BrowseComp 2025.1
- **Official Version:** 2025.1
- **Domain:** Complex multi-step web browsing, dynamic JS DOM extraction, cookie persistence, session management.
- **Runtime Environment:** Local Playwright browser engine (`matrix/tools/browser-engine.js`).
- **Status:** **`OFFICIAL_SUBSET_EXECUTED`** (6 Tasks executed via Browser Engine).
- **Official Grader Criteria:** Element state assertions, cookie retrieval, dynamic JS evaluation, SPA hydration check.

### 6. WebArena-Verified Hard
- **Official Version:** Verified Hard Split
- **Domain:** Multi-site web tasks across simulated e-commerce, GitLab, and shopping platforms.
- **Runtime Environment:** Self-hosted Docker Compose cluster running 4 web applications.
- **Status:** **`BLOCKED (DOCKER_COMPOSE_CLUSTER)`**
- **Blocker Details:** Requires running 4 live web application Docker containers concurrently.

### 7. GAIA (General AI Assistants)
- **Official Version:** 2023/2024 Split
- **Domain:** Complex multi-modal question answering requiring web search, audio transcription, and file parsing.
- **Runtime Environment:** Local Python environment with multimodal decoders and gated dataset.
- **Status:** **`BLOCKED (GATED_DATASET)`**
- **Blocker Details:** Gated HuggingFace dataset split requiring access token and external Python libraries.

---

## 4. Priority 3: Desktop & Realistic Work

### 8. OSWorld 2.0
- **Official Version:** 2.0
- **Domain:** Multimodal desktop operating system tasks (Ubuntu/GNOME GUI).
- **Runtime Environment:** QEMU Linux virtual machine with VNC screen capture.
- **Status:** **`BLOCKED (QEMU_LINUX_VM)`**
- **Blocker Details:** Host is native Windows desktop; OSWorld 2.0 evaluates against Ubuntu GNOME VM images.

### 9. TheAgentCompany
- **Official Version:** 1.0
- **Domain:** Realistic corporate employee simulation across intranet tools.
- **Runtime Environment:** Dockerized corporate network stack.
- **Status:** **`BLOCKED (DOCKER_DAEMON)`**
- **Blocker Details:** Requires localized intranet container network.

### 10. MLE-bench
- **Official Version:** 2024 Release (OpenAI)
- **Domain:** Autonomous machine learning engineering and Kaggle competition solving.
- **Runtime Environment:** Linux GPU cluster with CUDA and Kaggle API credentials.
- **Status:** **`BLOCKED (GPU_AND_KAGGLE_API)`**
- **Blocker Details:** Requires local CUDA GPU acceleration and Kaggle API authorization.

### 11. τ³-bench (Tau-bench)
- **Official Version:** 2024.1
- **Domain:** Conversational tool-use agent evaluation with dynamic user simulation.
- **Runtime Environment:** Python async environment with mock customer database.
- **Status:** **`BLOCKED (PYTHON_ASYNC_HARNESS)`**
- **Blocker Details:** Upstream package requires Python 3.11 virtual environment.

---

## 5. Priority 4: Knowledge & Long-Horizon Reliability

### 12. Humanity's Last Exam (HLE)
- **Official Version:** Verified Competition Split
- **Domain:** Frontier multi-discipline research questions across mathematics, chemistry, physics, and humanities.
- **Runtime Environment:** Official CAIS submission portal.
- **Status:** **`BLOCKED (CAIS_SUBMISSION_PORTAL)`**
- **Blocker Details:** Answers are private and evaluated via official CAIS competition portal.

### 13. Agents' Last Exam (ALE)
- **Official Version:** 2025.1
- **Domain:** Advanced autonomous agent reasoning and tool orchestration.
- **Runtime Environment:** Gated evaluation harness.
- **Status:** **`BLOCKED (CAIS_DATASET_GATE)`**
- **Blocker Details:** Dataset access gated by competition organizers.

### 14. METR Time Horizon 1.1
- **Official Version:** 1.1
- **Domain:** Measure of effective autonomous execution time before agent derailment or failure.
- **Runtime Environment:** Isolated Docker micro-VM sandboxes.
- **Status:** **`BLOCKED (DOCKER_MICRO_VM)`** / **`INTERNAL_EVALUATION`**
- **Status Details:** Official runner blocked by micro-VM requirements; internal METR survival curve evaluated via `matrix/evaluation/long-horizon-evaluator.js` (per-step reliability $\ge 0.99$).
