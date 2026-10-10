"""
scripts/run_mutation_testing.py
AGI 1.5 OMEGA EVOLUTION — Test Harness Self-Validation (Mutation Testing)

Injects 8 controlled, reversible faults across core subsystems:
1. SSRF boundary protection (web_browser.py)
2. Prompt injection pattern matching (injection_shield.py)
3. Dangerous terminal command policy (injection_shield.py)
4. Policy violation reason tagging (injection_shield.py)
5. Strata registry 500-stratum capacity (strata_registry.py)
6. OmegaMemoryEngine ready state transition (omega_memory.py)
7. Compatibility Gate 1.5.0 version check (compatibility_gate.py)
8. Capability Registry 1,200 count invariant (capability_registry.py)

For each fault:
- Injects mutation
- Executes target test suite to verify mutant is killed (fails as expected)
- Immediately restores clean code
- Cleans bytecode cache
- Verifies clean test suite passes
- Records killed/survived status and output

Outputs:
D:\\AGI_Evaluation\\AGI_1_5\\results\\mutation_results.json
"""

import os
import sys
import time
import json
import glob
import subprocess
import shutil

PYTHON_EXE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".venv", "Scripts", "python.exe"))
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

MUTATIONS = [
    {
        "mutant_id": "MUTANT-01-SSRF-BYPASS",
        "name": "Bypass SSRF IP blacklist check",
        "target_file": os.path.join(ROOT_DIR, "agi", "computer", "web_browser.py"),
        "original_snippet": "for pattern in BLOCKED_IP_PATTERNS:",
        "mutated_snippet": "for pattern in []:",
        "test_cmd": [PYTHON_EXE, "-B", os.path.join(ROOT_DIR, "tests", "test_ssrf_browser_security_15.py")],
        "subsystem": "agi.computer.web_browser"
    },
    {
        "mutant_id": "MUTANT-02-INJECTION-BYPASS",
        "name": "Bypass prompt injection regex pattern inspection",
        "target_file": os.path.join(ROOT_DIR, "agi", "security", "injection_shield.py"),
        "original_snippet": "for pattern in PROMPT_INJECTION_INDICATORS:",
        "mutated_snippet": "for pattern in []:",
        "test_cmd": [PYTHON_EXE, "-B", os.path.join(ROOT_DIR, "tests", "test_multiturn_attack_trajectories_15.py")],
        "subsystem": "agi.security.injection_shield"
    },
    {
        "mutant_id": "MUTANT-03-TERMINAL-POLICY-BYPASS",
        "name": "Bypass dangerous terminal command policy enforcement",
        "target_file": os.path.join(ROOT_DIR, "agi", "security", "injection_shield.py"),
        "original_snippet": "for pattern in DANGEROUS_COMMAND_PATTERNS:",
        "mutated_snippet": "for pattern in []:",
        "test_cmd": [PYTHON_EXE, "-B", os.path.join(ROOT_DIR, "tests", "test_internal_terminal_scenarios_15.py")],
        "subsystem": "agi.security.injection_shield"
    },
    {
        "mutant_id": "MUTANT-04-POLICY-TAG-BYPASS",
        "name": "Suppress INJECTION_DETECTED reason string in policy handling",
        "target_file": os.path.join(ROOT_DIR, "agi", "security", "injection_shield.py"),
        "original_snippet": 'return True, f"INJECTION_DETECTED: Matched adversarial pattern: {pattern.pattern}"',
        "mutated_snippet": 'return True, "CLEAN_PASS"',
        "test_cmd": [PYTHON_EXE, "-B", os.path.join(ROOT_DIR, "tests", "test_policy_instruction_handling_15.py")],
        "subsystem": "agi.security.injection_shield"
    },
    {
        "mutant_id": "MUTANT-05-STRATA-CEILING-CORRUPT",
        "name": "Corrupt strata registry total ceiling from 500 to 200",
        "target_file": os.path.join(ROOT_DIR, "agi", "memory", "strata_registry.py"),
        "original_snippet": "for stratum_id in range(1, 501):",
        "mutated_snippet": "for stratum_id in range(1, 201):",
        "test_cmd": [PYTHON_EXE, "-B", os.path.join(ROOT_DIR, "tests", "test_memory_stress_staged_15.py")],
        "subsystem": "agi.memory.strata_registry"
    },
    {
        "mutant_id": "MUTANT-06-MEMORY-STATE-CORRUPT",
        "name": "Force OmegaMemoryEngine initialization into FAILED state instead of READY",
        "target_file": os.path.join(ROOT_DIR, "agi", "memory", "omega_memory.py"),
        "original_snippet": "self.state = StorageState.READY",
        "mutated_snippet": "self.state = StorageState.FAILED",
        "test_cmd": [PYTHON_EXE, "-B", os.path.join(ROOT_DIR, "tests", "test_checkpoint_recovery_suite_15.py")],
        "subsystem": "agi.memory.omega_memory"
    },
    {
        "mutant_id": "MUTANT-07-COMPAT-GATE-VERSION-BREAK",
        "name": "Break Compatibility Gate version expectation to 9.9.9",
        "target_file": os.path.join(ROOT_DIR, "agi", "runtime", "compatibility_gate.py"),
        "original_snippet": 'if ver != "1.5.0" or code != "OMEGA EVOLUTION":',
        "mutated_snippet": 'if ver != "9.9.9" or code != "OMEGA EVOLUTION":',
        "test_cmd": [PYTHON_EXE, "-B", os.path.join(ROOT_DIR, "tests", "test_agi_15_platform_master.py")],
        "subsystem": "agi.runtime.compatibility_gate"
    },
    {
        "mutant_id": "MUTANT-08-CAPABILITY-COUNT-BREAK",
        "name": "Corrupt total capability count assertion to 999",
        "target_file": os.path.join(ROOT_DIR, "agi", "capabilities", "capability_registry.py"),
        "original_snippet": 'return len([k for k in self.capabilities.keys() if len(k) == 8])',
        "mutated_snippet": "return 999",
        "test_cmd": [PYTHON_EXE, "-B", os.path.join(ROOT_DIR, "tests", "test_agi_15_platform_master.py")],
        "subsystem": "agi.capabilities.capability_registry"
    }
]


def clear_pycache():
    for root, dirs, files in os.walk(os.path.join(ROOT_DIR, "agi")):
        for d in dirs:
            if d == "__pycache__":
                shutil.rmtree(os.path.join(root, d), ignore_errors=True)
    for root, dirs, files in os.walk(os.path.join(ROOT_DIR, "tests")):
        for d in dirs:
            if d == "__pycache__":
                shutil.rmtree(os.path.join(root, d), ignore_errors=True)


def run_mutation_cycle():
    results = []
    print("=" * 78)
    print("  AGI 1.5 TEST-HARNESS MUTATION VALIDATION (8 CONTROLLED FAULTS)")
    print("=" * 78)

    env = dict(os.environ)
    env["PYTHONDONTWRITEBYTECODE"] = "1"

    t0_overall = time.time()
    all_killed = True

    # Pre-clean pycache
    clear_pycache()

    for idx, mut in enumerate(MUTATIONS, 1):
        mid = mut["mutant_id"]
        target = mut["target_file"]
        orig_snip = mut["original_snippet"]
        mut_snip = mut["mutated_snippet"]
        cmd = mut["test_cmd"]

        print(f"\n[{idx}/8] Testing {mid}: {mut['name']}...")
        with open(target, "r", encoding="utf-8") as f:
            clean_content = f.read()

        if orig_snip not in clean_content:
            print(f"  [ERROR] Original snippet not found in {target}")
            results.append({
                "mutant_id": mid,
                "name": mut["name"],
                "status": "ERROR_SNIPPET_NOT_FOUND",
                "killed": False
            })
            all_killed = False
            continue

        mutated_content = clean_content.replace(orig_snip, mut_snip, 1)

        t_start_mut = time.time()
        try:
            # 1. Apply mutation
            with open(target, "w", encoding="utf-8") as f:
                f.write(mutated_content)
            clear_pycache()

            # 2. Run target test (EXPECT FAILURE)
            proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=ROOT_DIR, env=env)
            dur_mut = time.time() - t_start_mut

            if proc.returncode != 0:
                print(f"  -> MUTANT KILLED! Test failed as expected (exit code {proc.returncode}) in {dur_mut:.2f}s")
                killed = True
            else:
                print(f"  -> WARNING: MUTANT SURVIVED! Test passed despite faulty code!")
                killed = False
                all_killed = False

        finally:
            # 3. Restore clean content immediately
            with open(target, "w", encoding="utf-8") as f:
                f.write(clean_content)
            clear_pycache()

        # 4. Verify clean test passes
        proc_clean = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=ROOT_DIR, env=env)
        clean_pass = proc_clean.returncode == 0
        if not clean_pass:
            print(f"  -> [CRITICAL] Clean restoration failed to pass tests! Output: {proc_clean.stderr[:200]}")
            all_killed = False
        else:
            print(f"  -> Clean code verified: tests PASS cleanly.")

        results.append({
            "mutant_id": mid,
            "name": mut["name"],
            "subsystem": mut["subsystem"],
            "status": "KILLED" if killed else "SURVIVED",
            "killed": killed,
            "clean_restored_pass": clean_pass,
            "duration_seconds": round(dur_mut, 3)
        })

    total_dur = time.time() - t0_overall
    killed_count = sum(1 for r in results if r.get("killed", False))
    kill_rate = (killed_count / len(results)) * 100.0

    print("\n" + "=" * 78)
    print(f"  MUTATION TEST RESULTS: {killed_count}/{len(results)} MUTANTS KILLED ({kill_rate:.1f}%)")
    print(f"  Clean Code Restored: {'ALL VERIFIED' if all_killed else 'CHECK FAILURES'}")
    print(f"  Total Duration: {total_dur:.2f} seconds")
    print("=" * 78)

    output_payload = {
        "version": "1.5.0",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_mutants": len(results),
        "killed_count": killed_count,
        "survived_count": len(results) - killed_count,
        "kill_rate_pct": kill_rate,
        "all_killed": all_killed,
        "mutant_evaluations": results
    }

    # Write to D: external volume
    d_path = r"D:\AGI_Evaluation\AGI_1_5\results\mutation_results.json"
    try:
        os.makedirs(os.path.dirname(d_path), exist_ok=True)
        with open(d_path, "w", encoding="utf-8") as f:
            json.dump(output_payload, f, indent=2)
        print(f"Successfully recorded results to {d_path}")
    except Exception as e:
        print(f"Warning: Failed to write to {d_path}: {e}")

    # Also save local backup
    local_path = os.path.join(ROOT_DIR, "config", "agi15", "mutation_results.json")
    try:
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "w", encoding="utf-8") as f:
            json.dump(output_payload, f, indent=2)
    except Exception:
        pass

    sys.exit(0 if all_killed else 1)


if __name__ == "__main__":
    run_mutation_cycle()
