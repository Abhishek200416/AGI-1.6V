# AGI 1.7 — OMEGA COMMAND: Production Security & Governance Specification

## 1. Mandatory Production Container Isolation (Fail-Closed Default)

Production execution of untrusted repository code, test suites, or model-generated patches in **AGI 1.7 — OMEGA COMMAND** (`AGI17Adapter`, `HierarchicalOrchestrator`, and `CIRepairAgent`) is governed by `SandboxPolicy.production()` in [`sandbox_runner.py`](../agents/AGI_1_7/engine/agi17/process_supervision/sandbox_runner.py):

- **Default Isolation Mode:** `isolation_mode = "docker"`, `require_container_isolation = True`, `require_pinned_image_digest = True`, `allow_host_subprocess_fallback = False`.
- **Approved Digest-Pinned Image Allowlist (`APPROVED_PRODUCTION_IMAGES`):**
  - `python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1`
- **Zero Silent Host Fallback & Strict `.RepoDigests` Verification:** Host subprocess execution (`python -m unittest` on the host OS) is strictly disabled in production.
  - `detect_docker_python_image()` executes `docker image inspect <image> --format "{{json .RepoDigests}}"` (`shell=False`) and requires the expected `@sha256:...` digest to be present in `.RepoDigests`.
  - If the `docker` CLI, the Docker daemon, or the expected image digest in `.RepoDigests` is unavailable, execution fails closed immediately with `SandboxIsolationUnavailableError`.
  - If a caller supplies an unpinned image, a mutable tag (`:latest`), an unapproved digest, or attempts to enable `allow_host_subprocess_fallback=True` when `require_container_isolation=True`, policy validation fails closed immediately with `SandboxPolicyViolationError`.
- **Explicit Development Mode (`SandboxPolicy.development()`):**
  - `SandboxPolicy.development()` is restricted strictly to non-production local development and offline mocked unit tests (or when `--dev-sandbox` is explicitly passed to `demo_real_multi_agent_code_fix.py`). It is never activated automatically in response to Docker or image failure.
- **Runtime Security Diagnostics (`get_security_diagnostics()`):**
  - `AGI17Adapter`, `HierarchicalOrchestrator`, `CIRepairAgent`, and `DisposableSandboxRunner` expose `get_security_diagnostics()`, verifying identical `sandbox_runner` and `approval_gate` object identity (`shared_sandbox_runner_verified = True`, `shared_approval_gate_verified = True`).

---

## 2. Hardened Container Runtime Flags & Shell-Free Execution

Every disposable container launched by `DisposableSandboxRunner.run_python_unittest_sandbox()` enforces:

- `--rm --name agi17_sbx_<id>` (unique deterministic container name for lifecycle inspection and forced cleanup)
- `--network none` (complete network disablement inside the container)
- `--read-only` (immutable root filesystem)
- `--tmpfs /tmp:rw,noexec,nosuid,size=64m` (bounded non-executable temporary scratch space)
- `--cap-drop ALL` and `--security-opt no-new-privileges`
- `--pids-limit 64`, `--memory 256m`, `--cpus 1.0`
- `--user 65534:65534` (unprivileged `nobody:nogroup` UID/GID)
- `--workdir /tmp` with `-v <staging_dir>:/input:ro` (read-only input mount copied into writable `/tmp/sbx_work` inside Python)
- **Shell-Free `test_pattern` Execution (`shell=False`):**
  - `validate_test_pattern()` validates `test_pattern` against `^(?:test[A-Za-z0-9_*?.-]*|[A-Za-z0-9_*?.-]*_test)\.py$` (max 128 characters, zero path separators or shell metacharacters) before staging or container launch (`InvalidTestPatternError`).
  - Container invocation executes `python3 -B -s -c <_CONTAINER_UNITTEST_BOOTSTRAP> <validated_pattern>` where `<validated_pattern>` is passed as a distinct `argv` element (`sys.argv[1]`) with zero `sh -c` or `/bin/sh` invocation.

---

## 3. Verified Container Termination & Staging Cleanup

In `DisposableSandboxRunner._run_in_docker_container()`:

1. On timeout (`subprocess.TimeoutExpired`), exception, or nonzero container exit (`exit_code != 0`), `_terminate_and_remove_container()` executes bounded graceful stop (`docker stop -t 2 <container_name>`) followed by `docker kill <container_name>` and `docker rm -f <container_name>`.
2. In the `finally:` block, `_verify_container_removed()` executes `docker container inspect <container_name>` and verifies that the container no longer exists (`container_cleanup_verified = True`). Container cleanup is never inferred from host temporary-directory cleanup.
3. The temporary host staging directory is removed via `shutil.rmtree()` and checked via `not staging_dir.exists()` (`filesystem_cleanup_verified = True`).
4. Both `CIRepairAgent` and `HierarchicalOrchestrator` require `filesystem_cleanup_verified and container_cleanup_verified`; if either check fails, `SandboxCleanupUnverifiedError` is raised (`terminal_outcome = "BLOCKED_BY_POLICY"`, CLI exit code `2`).

---

## 4. Pre-Read Path Containment, External Candidate Staging & Approval Gates

1. **Pre-Read & Pre-Model Path Containment (`validate_relative_sandbox_path`):**
   - Validates `module_filename` and `test_filename` before reading any file or invoking any model call.
   - Rejects empty paths, absolute paths, Windows drive-qualified or UNC paths, `..` traversal, NUL/control characters, Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`), non-`.py` extensions, symlinks, FIFOs, sockets, and block/char devices (`PathTraversalBlockedError` / `PathTraversalViolationError`).
2. **Untrusted Content & Prompt-Injection Scanner (`scan_untrusted_content`):**
   - Distinguishes prompt-injection strings in comments/docstrings (`warnings`, recorded in telemetry without blocking benign documentation) from dangerous executable patterns (raising `UntrustedContentBlockedError`):
     - Credential/secret file reads (`.env`, `.ssh`, `.aws`, `.gemini`, `id_rsa`)
     - Private/loopback/metadata SSRF (`169.254.169.254`, `metadata.google.internal`)
     - Dangerous host process execution (`subprocess.*(..., shell=True)`, `os.system(...)`)
3. **Authoritative Approval Gate & External Candidate Staging (`HighImpactApprovalGate` & `stage_candidate_outside_workspace`):**
   - `HighImpactApprovalGate.check_workspace_mutation()` defaults to `explicit_approval: bool = False`, eliminating any implicit or hardcoded approval bypass.
   - Approval and path containment are checked at preflight before protected file reads, model disclosure, sandbox test execution, or workspace writes. When approval is denied (`block_workspace_mutations=True` or denied callback), **zero protected reads, zero model calls, zero test runs, and zero workspace writes** occur.
   - Candidate code and repairs are always staged first in an isolated external directory outside the active workspace via `stage_candidate_outside_workspace()` (`staged_outside_workspace = True`) and verified in the disposable container before `atomic_write_workspace_file()` (temp file + `flush()` + `os.fsync()` + `os.replace()`) touches the target workspace.

---

## 5. Test Immutability & Mandatory Full-Suite Regression Verification

- **Test File Immutability:** During `CIRepairAgent` repair and `HierarchicalOrchestrator` Stage 4 self-healing, all existing `test_*.py` files are SHA-256 snapshotted before repair and verified byte-for-byte unchanged before completion. Any attempt to modify a test file during repair raises `HighImpactActionBlockedError`.
- **Two-Stage Regression Gate:** When a focused `test_pattern` (e.g. `test_focus.py`) passes after a candidate patch, `CIRepairAgent` automatically runs a second independent full-suite verification pass (`test_*.py`) inside a fresh disposable container and requires `regression_suite_passed = True` (`0` regressions across the entire repository test suite) before reporting `SUCCEEDED_AND_VERIFIED`.

---

## 6. Deterministic CLI Exit Codes (`0..6`) & Detached Execution Honesty

[`run_agi_17.py`](../agents/AGI_1_7/run_agi_17.py) maps every terminal outcome to a distinct process exit code (`TERMINAL_OUTCOME_EXIT_CODES`):

| Exit Code | Terminal Outcome(s) | Meaning |
| :-: | :--- | :--- |
| **`0`** | `SUCCEEDED_AND_VERIFIED`, `PROFILE_ONLY_OK`, `ALREADY_PASSING` | Mission succeeded with verified sandbox tests and artifact SHA-256 checks. |
| **`1`** | `FAILED` | Mission or repair failed verification. |
| **`2`** | `BLOCKED_BY_POLICY` | Blocked by sandbox policy, path containment, content scanner, approval gate, or cleanup verification. |
| **`3`** | `TIMED_OUT` | Mission, repair loop, or sandbox container exceeded its wall-clock timeout. |
| **`4`** | `CANCELLED` | Mission cancelled via `CommandInbox` or operator intervention. |
| **`5`** | `BUDGET_EXCEEDED` | Mission exceeded its cumulative token or USD cost ceiling. |
| **`6`** | `SUCCEEDED_UNVERIFIED` | Code or output generated without passing container verification. |

When launched with `--detach`, the parent launcher process reports `"status": "DETACHED_RUNNING"`, `"terminal_outcome": "DETACHED_LAUNCHED_UNVERIFIED"`, and `"mission_verified": false`, while the detached child process writes the final `status`, `terminal_outcome`, `mission_verified`, and `exit_code` to `<task_id>.pid.json` upon completion or failure.
