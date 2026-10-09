# AGI 0.7 — Terminal-Bench 2.0 Evaluation Report

**Mission ID:** `AGI-07-EXTERNAL-BENCHMARK-CAMPAIGN-2026`  
**Benchmark:** Terminal-Bench 2.0  
**Harness / Framework:** Harbor Framework (`https://github.com/harbor-framework/harbor`, `https://github.com/harbor-framework/terminal-bench-2`)  
**Evaluation Target:** AGI 0.7  
**Status:** `BLOCKED`  
**Diagnostic Timestamp:** 2026-10-09  

---

## 1. Benchmark Overview & Requirements

Terminal-Bench 2.0 evaluates autonomous agents on complex command-line interaction, system administration, coding, and debugging tasks. It uses Harbor as its official evaluation harness.
- **Harness:** Harbor v0.2+
- **Execution Architecture:** Harbor launches each task inside an isolated Linux container with a pseudo-terminal (PTY) interface, executing shell commands and inspecting process states and filesystem mutations.
- **Minimum System Requirements:**
  - Running Docker Daemon (or rootless Podman) on Linux/WSL2
  - Active network ingress for pulling base container images (`harbor-framework/*`)
  - Minimum 25 GB free disk space for container image layers and task volumes
  - Host pty subsystem support

---

## 2. Preflight Audit & Blocker Root Cause

During the integrity preflight (Part 3), the environment was audited for Terminal-Bench / Harbor compatibility:

```powershell
docker ps
# Output: failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine:
# The system cannot find the file specified.

wsl --status
# Output: Access is denied. Error code: Wsl/E_ACCESSDENIED

Get-Service -Name *docker*
# Output: Stopped com.docker.service Docker Desktop Service
```

### Detailed Blocker Findings:
1. **Docker Daemon Inactive:** The local Docker Desktop Service is installed but in a `Stopped` state. Attempting to start the service via `Start-Service com.docker.service` requires elevated administrative privileges that are not granted in the current user session.
2. **WSL2 Subsystem Access Denied:** Direct access to the WSL2 virtual machine subsystem failed with `Wsl/E_ACCESSDENIED`. Without WSL2 or a running Docker engine, Linux PTY containers cannot be initialized.
3. **Storage Budget:** The host C: drive has 16.2 GB free space, which is below the recommended safety buffer required for multiple multi-gigabyte Docker container images.

---

## 3. Verdict & Remediation Roadmap

- **Status:** `BLOCKED_BY_CONTAINER_DAEMON`
- **Official Tasks Executed:** 0
- **Remediation Steps Required to Unblock:**
  1. Start Docker Desktop service with administrative elevation on the host.
  2. Grant WSL2 permissions to the active user account.
  3. Verify `docker ps` returns a clean status.
  4. Install Harbor CLI (`uv pip install harbor-framework`) and run the pilot task set (`harbor run terminal-bench-2 --agent agi-0-7`).
