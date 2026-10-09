# Open-Source Agent Adapter: OpenCode

> **Category**: `CODING_AGENT` | **Status**: `REJECTED_DUPLICATE` | **License**: `MIT`

## 1. When to Use
Interactive terminal TUI pair programming outside Antigravity IDE when a standalone terminal session is preferred by the developer.

## 2. How to Invoke
```bash
opencode -p "<instruction>" --model <model-name>
```

## 3. Required Dependencies
- Node.js >= 20 or Bun
- npm i -g @anomalyco/opencode
- Provider API Key

## 4. Permissions Scoped
- `terminal_exec`
- `filesystem_write`
- `network_ingress`

## 5. Input Contract
```json
{
  "type": "object",
  "required": [
    "query"
  ],
  "properties": {
    "query": {
      "type": "string",
      "description": "Coding instruction or refactoring request"
    },
    "files": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Array of file paths to target"
    }
  }
}
```

## 6. Output Deliverables
```json
{
  "type": "object",
  "required": [
    "diff",
    "explanation"
  ],
  "properties": {
    "diff": {
      "type": "string",
      "description": "Git-style diff applied to files"
    },
    "explanation": {
      "type": "string",
      "description": "Markdown explanation of changes"
    }
  }
}
```

## 7. Limitations
Functional duplicate of native Antigravity coding agents (`senior-fullstack-engineer`, `backend-engineer`). Adds redundant Node/Bun runtime overhead with zero new capabilities.

## 8. Security & Sandboxing Concerns
Direct unrestricted host shell access and file editing outside Antigravity's audited permission sandbox.
