# Open-Source Agent Adapter: Qwen Code

> **Category**: `CODING_AGENT` | **Status**: `REJECTED_DUPLICATE` | **License**: `Apache-2.0`

## 1. When to Use
External command-line coding sessions specifically targeted at locally hosted Qwen Coder models.

## 2. How to Invoke
```bash
npx @qwen-code/qwen-code <command>
```

## 3. Required Dependencies
- Node.js >= 22
- OpenAI-compatible local endpoint or DashScope API key

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
      "description": "Refactoring instruction"
    },
    "files": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Target source files"
    }
  }
}
```

## 6. Output Deliverables
```json
{
  "type": "object",
  "required": [
    "diff"
  ],
  "properties": {
    "diff": {
      "type": "string",
      "description": "Applied source diff"
    }
  }
}
```

## 7. Limitations
Quality Score (72/100) below quality threshold (75/100). Duplicates native coding agent capabilities without adding architectural value.

## 8. Security & Sandboxing Concerns
Unverified third-party Node package executing arbitrary shell commands.
