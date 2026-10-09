# Open-Source Agent Adapter: OpenHands

> **Category**: `AUTONOMOUS_SWE` | **Status**: `ADAPTER_READY` | **License**: `MIT`

## 1. When to Use
When complex, end-to-end multi-step autonomous repository tasks or broad multi-repo refactoring challenges require a full containerized execution sandbox outside the main Antigravity process.

## 2. How to Invoke
```bash
docker run -it --pull=always --security-opt=no-new-privileges:true --cap-drop=ALL -e SANDBOX_USER_ID=$(id -u) -e WORKSPACE_BASE=$PWD -v $PWD:/workspace:rw -p 3000:3000 ghcr.io/all-hands-ai/openhands:0.19
```

## 3. Required Dependencies
- Docker Daemon (Rootless or Podman recommended)
- API Key (Anthropic / OpenAI / Gemini)

## 4. Permissions Scoped
- `docker_daemon`
- `filesystem_write`
- `terminal_exec`
- `network_ingress`

## 5. Input Contract
```json
{
  "type": "object",
  "required": [
    "workspacePath",
    "prompt"
  ],
  "properties": {
    "workspacePath": {
      "type": "string",
      "description": "Absolute path to repository root"
    },
    "prompt": {
      "type": "string",
      "description": "Detailed autonomous task or issue description"
    },
    "model": {
      "type": "string",
      "description": "Model identifier (e.g. claude-3-5-sonnet, gemini-2.0-pro)"
    }
  }
}
```

## 6. Output Deliverables
```json
{
  "type": "object",
  "required": [
    "gitDiff",
    "testStatus"
  ],
  "properties": {
    "gitDiff": {
      "type": "string",
      "description": "Standard patch diff of changes applied in container"
    },
    "eventStreamLog": {
      "type": "string",
      "description": "Full execution traces, terminal outputs, and tool calls"
    },
    "testStatus": {
      "type": "string",
      "enum": [
        "PASSED",
        "FAILED",
        "BLOCKED"
      ],
      "description": "Outcome of test assertions run inside container"
    }
  }
}
```

## 7. Limitations
Heavyweight setup (~4GB container image); requires running Docker daemon; cold-start latency; duplicates Antigravity native file editing tools if run locally without container isolation.

## 8. Security & Sandboxing Concerns
Host root privilege escalation mitigated by disallowing docker.sock host mounting; container runs with --security-opt=no-new-privileges and dropped capabilities.
