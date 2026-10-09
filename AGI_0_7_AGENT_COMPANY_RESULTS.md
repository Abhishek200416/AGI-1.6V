# AGI 0.7 — TheAgentCompany Evaluation Report

**Mission ID:** `AGI-07-EXTERNAL-BENCHMARK-CAMPAIGN-2026`  
**Benchmark:** TheAgentCompany (Digital Worker Benchmark)  
**Official Project:** `https://github.com/TheAgentCompany/TheAgentCompany`  
**Evaluation Target:** AGI 0.7  
**Status:** `BLOCKED`  
**Diagnostic Timestamp:** 2026-10-09  

---

## 1. Benchmark Scope & Execution Architecture

TheAgentCompany benchmarks autonomous digital worker agents across consequential enterprise tasks spanning coding, digital workplace research, data workflows, and communication with synthetic coworkers.
- **Infrastructure Architecture:**
  - Full local digital enterprise network simulation via Docker Compose:
    - GitLab server (code repositories and merge requests)
    - Plane server (issue tracking and project management)
    - ownCloud server (file storage and documents)
    - RocketChat server (chat collaboration with synthetic coworkers)
  - 175 task Docker images (`ghcr.io/theagentcompany/*`), each containing dedicated environments.

---

## 2. Integrity Preflight & Hardware Constraints

During preflight verification of system resources and documentation requirements:
1. **Explicit Storage Requirement:** The official documentation (`https://github.com/TheAgentCompany/TheAgentCompany#step-1-setup-the-servers`) explicitly specifies:
   > *"you should have docker and docker compose installed, and 30+ GB of free disk space"*
2. **Host Storage Deficit:** The primary drive C: has **16.2 GB free disk space**, which is less than half the required 30 GB minimum for the enterprise server compose stack and pre-baked databases.
3. **Container Daemon Status:** Docker Desktop daemon is `Stopped`, preventing initialization of `docker-compose.yaml`.
4. **Safety & Host Boundaries:** Preflight confirmed that simulated enterprise tasks should never run against live personal databases. Without container isolation, this benchmark cannot safely execute.

---

## 3. Verdict & Status

- **Status:** `BLOCKED_BY_ENVIRONMENT`
- **Root Causes:**
  1. Insufficient storage space on C: (16.2 GB available vs 30+ GB hard requirement).
  2. Inactive Docker Desktop daemon and compose runtime.
- **Enterprise Tasks Executed:** 0
- **Remediation Roadmap:**
  - Allocate a dedicated drive with at least 50 GB free disk space.
  - Enable Docker Desktop daemon with admin elevation.
  - Run `setup.bat` to provision the Plane, GitLab, ownCloud, and RocketChat enterprise cluster.
