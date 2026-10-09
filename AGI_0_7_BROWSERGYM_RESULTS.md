# AGI 0.7 — BrowserGym & AgentLab Evaluation Report

**Mission ID:** `AGI-07-EXTERNAL-BENCHMARK-CAMPAIGN-2026`  
**Benchmark:** BrowserGym / AgentLab (WebArenaVerified, VisualWebArena, WorkArena)  
**Official Projects:**  
- `https://github.com/ServiceNow/BrowserGym`  
- `https://github.com/ServiceNow/AgentLab`  
**Evaluation Target:** AGI 0.7  
**Status:** `BLOCKED`  
**Diagnostic Timestamp:** 2026-10-09  

---

## 1. Benchmark Overview & Infrastructure

BrowserGym and AgentLab provide shared gym environments for evaluating multimodal browsing agents on realistic, complex web tasks across:
- **WebArena & WebArenaVerified:** E-commerce, Reddit-like forums, GitLab repositories, Wikipedia.
- **VisualWebArena:** Visually grounded multi-page workflows.
- **WorkArena:** Enterprise workflows built on ServiceNow instance environments.
- **AssistantBench:** General assistant browsing tasks.

---

## 2. Preflight Audit & Dependency Constraints

A preflight inspection using `uv pip install browsergym --dry-run` yielded:
- **122 packages required**, including heavyweight dependencies:
  - `torch==2.14.1` (~2.5 GB download)
  - `transformers==4.57.6`
  - `scipy==1.18.1`, `pandas==3.0.6`, `pyarrow==26.0.0`
- **Total Download Size:** Approximately 4–6 GB of Python wheels, requiring ~10 GB uncompressed storage on disk.
- **Host Storage Limit:** Host C: drive has 16.2 GB free space. Installing the full BrowserGym ML stack on C: would reduce remaining disk space to under 8 GB, violating Part 3 Rule 5 ("Do not exhaust the user's internal storage").
- **Environment Dependency:** WebArena, VisualWebArena, and WorkArena require local Docker containers to host the self-hosted web applications (Shopping, Reddit, GitLab). As verified in the environment audit, the Docker Desktop daemon is inactive and cannot be started without administrative elevation.

---

## 3. Alternative Browser Capability Audit: AGI 0.7 ComputerAdapter

While the heavyweight external BrowserGym harness is blocked by container and disk constraints, AGI 0.7's native computer and browser interfaces were verified:
1. **Playwright Integration:** Native Antigravity Playwright tools are registered (`browser_navigate`, `browser_snapshot`, `browser_click`).
2. **Coordinate & Scale Normalization:** `agi/computer/computer-adapter.js` enforces display bounds (1920x1080) and display scale factor normalization.
3. **Domain Whitelist Security:** Enforces strict domain allowlist checking, blocking navigation to arbitrary unvetted endpoints.

---

## 4. Verdict & Status

- **Status:** `BLOCKED_BY_ENVIRONMENT`
- **Root Causes:**
  1. Docker daemon stopped (cannot host WebArena website containers).
  2. Heavyweight ML dependency tree (torch/transformers) exceeds host storage budget.
- **Tasks Run:** 0
- **Remediation:** Configure Docker on a drive with >50 GB free space (e.g., D: drive).
