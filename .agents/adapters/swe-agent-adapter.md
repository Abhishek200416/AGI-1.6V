# Open-Source Agent Adapter: SWE-agent

> **Category**: `BENCHMARK_AGENT` | **Status**: `ADAPTER_READY` | **License**: `MIT`

## 1. When to Use
When running rigorous academic benchmark evaluations (SWE-bench) or testing automated patch generation against raw GitHub issues via Docker-isolated Agent-Computer Interface (ACI).

## 2. How to Invoke
```bash
python run.py --model_name <model> --data_path <github_issue_or_problem_statement> --repo_path <repo> --apply_patch_locally
```

## 3. Required Dependencies
- Docker Engine (Rootless recommended)
- Python 3.10+
- swe-agent python package
- GitHub token

## 4. Permissions Scoped
- `docker_daemon`
- `filesystem_write`
- `terminal_exec`

## 5. Input Contract
```json
{
  "type": "object",
  "required": [
    "issueUrl",
    "repoPath"
  ],
  "properties": {
    "issueUrl": {
      "type": "string",
      "description": "GitHub Issue URL or problem statement text"
    },
    "repoPath": {
      "type": "string",
      "description": "Local or remote repository path"
    },
    "testPatch": {
      "type": "string",
      "description": "Optional golden test patch to verify fix"
    }
  }
}
```

## 6. Output Deliverables
```json
{
  "type": "object",
  "required": [
    "patch",
    "evalResult"
  ],
  "properties": {
    "patch": {
      "type": "string",
      "description": "Unified diff patch file resolving the issue"
    },
    "trajectory": {
      "type": "string",
      "description": "Full step-by-step reasoning and ACI action log"
    },
    "evalResult": {
      "type": "string",
      "enum": [
        "RESOLVED",
        "FAILED"
      ],
      "description": "RESOLVED or FAILED benchmark metric"
    }
  }
}
```

## 7. Limitations
Heavy dependency on Docker environment; high token consumption per task (100k+ tokens); slow execution speed compared to direct specialist editing.

## 8. Security & Sandboxing Concerns
Executes unverified code and shell commands inside Docker container; potential network egress if container is not network-isolated.
