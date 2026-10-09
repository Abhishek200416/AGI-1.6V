# Open-Source Agent Adapter: Cline

> **Category**: `IDE_CODING_AGENT` | **Status**: `REJECTED_DUPLICATE` | **License**: `Apache-2.0`

## 1. When to Use
Standalone usage inside external VS Code editor sessions outside Antigravity.

## 2. How to Invoke
```bash
Launched as VS Code Extension (`saoudrizwan.claude-dev` / Cline) or headless CLI wrapper.
```

## 3. Required Dependencies
- VS Code / Cursor / VSCodium
- Node.js runtime
- API Keys

## 4. Permissions Scoped
- `terminal_exec`
- `filesystem_write`

## 5. Input Contract
```json
{
  "type": "object",
  "required": [
    "prompt"
  ],
  "properties": {
    "prompt": {
      "type": "string",
      "description": "Development request"
    },
    "contextFiles": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Editor open tabs and workspace files"
    }
  }
}
```

## 6. Output Deliverables
```json
{
  "type": "object",
  "required": [
    "edits"
  ],
  "properties": {
    "edits": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Workspace file edits"
    },
    "terminalOutputs": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Executed command results"
    }
  }
}
```

## 7. Limitations
REJECTED — DUPLICATE CAPABILITY of native Antigravity IDE agent engine. Running Cline inside Antigravity creates unnecessary IDE-in-IDE nesting and redundant MCP hosting.

## 8. Security & Sandboxing Concerns
Has full permissions within its VS Code host process; must not be granted unchecked terminal approval.
