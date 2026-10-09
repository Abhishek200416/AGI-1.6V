import sys
import os
import subprocess
import time
import json

def get_commit():
    try:
        res = subprocess.run('cmd /c "set GIT_CONFIG_NOSYSTEM=1& set GIT_CONFIG_GLOBAL=NUL& git rev-parse HEAD"', capture_output=True, text=True, shell=True)
        return res.stdout.strip()
    except Exception as e:
        return str(e)

def run_suite(cmd):
    start = time.time()
    start_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(start))
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=60, shell=True)
        end = time.time()
        end_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(end))
        return {
            "command": cmd,
            "exit_code": res.returncode,
            "start_time": start_iso,
            "end_time": end_iso,
            "duration_s": round(end - start, 3),
            "stdout": res.stdout,
            "stderr": res.stderr
        }
    except Exception as e:
        end = time.time()
        return {
            "command": cmd,
            "exit_code": -1,
            "start_time": start_iso,
            "end_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(end)),
            "duration_s": round(end - start, 3),
            "stdout": "",
            "stderr": str(e)
        }

def main():
    commit = get_commit()
    suites = [
        "node .agents/v4/tests/validation-suite.js",
        "node matrix/tests/x12-architecture-suite.js",
        "node agi/tests/acceptance-suite.js",
        "node agi/tests/security-suite.js",
        "node agi/tests/regression-guard-suite.js"
    ]

    results = {
        "git_commit": commit,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "suites": {}
    }

    for s in suites:
        print(f"Running suite: {s} ...")
        res = run_suite(s)
        results["suites"][s] = res
        print(f"  Exit Code: {res['exit_code']} (took {res['duration_s']}s)")

    out_file = "agi/benchmarks/results/baseline_suites_execution.json"
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print(f"\nExecution records saved to {out_file}")

if __name__ == "__main__":
    main()
