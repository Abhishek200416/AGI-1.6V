# Open-Source Agent Adapter: Goose

> **Category**: `MCP_AGENT` | **Status**: `ADAPTER_READY` | **License**: `Apache-2.0`

## 1. When to Use
When leveraging community MCP extensions or standalone headless recipe execution that require Goose's Rust-based MCP host runner.

## 2. How to Invoke
```bash
goose run --text "<instruction>" --recipe <path-to-recipe.yaml>
```

## 3. Required Dependencies
- Goose binary (cargo or pre-built release)
- Active MCP servers configuration

## 4. Permissions Scoped
- `terminal_exec`
- `filesystem_write`

## 5. Input Contract
```json
{
  "type": "object",
  "required": [
    "text"
  ],
  "properties": {
    "text": {
      "type": "string",
      "description": "Task description or automated prompt"
    },
    "recipe": {
      "type": "string",
      "description": "Optional path to automated YAML recipe"
    }
  }
}
```

## 6. Output Deliverables
```json
{
  "type": "object",
  "required": [
    "summary"
  ],
  "properties": {
    "summary": {
      "type": "string",
      "description": "Execution completion text"
    },
    "mcpToolLogs": {
      "type": "array",
      "items": {
        "type": "object"
      },
      "description": "Record of tool calls and results"
    }
  }
}
```

## 7. Limitations
Rust binary must be precompiled or downloaded; Antigravity already provides native MCP client execution via `call_mcp_tool`.

## 8. Security & Sandboxing Concerns
External MCP servers invoked by Goose must adhere to the same least-privilege standards; secrets must never be passed in cleartext CLI flags.
