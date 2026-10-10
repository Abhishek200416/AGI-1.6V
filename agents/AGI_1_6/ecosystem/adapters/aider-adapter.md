# Open-Source Agent Adapter: Aider

> **Category**: `PAIR_PROGRAMMING` | **Status**: `ADAPTER_READY` | **License**: `Apache-2.0`

## 1. When to Use
When generating ultra-compact AST whole-repository maps or requiring automated single-commit-per-change git workflows for large multi-file refactoring.

## 2. How to Invoke
```bash
aider --model <model> --message "<task>" --no-git --yes
```

## 3. Required Dependencies
- Python 3.10+
- pip install aider-chat
- git CLI
- LLM API Key

## 4. Permissions Scoped
- `git_exec`
- `terminal_exec`
- `filesystem_write`

## 5. Input Contract
```json
{
  "type": "object",
  "required": [
    "task"
  ],
  "properties": {
    "task": {
      "type": "string",
      "description": "Programming instruction"
    },
    "files": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of files to add to the chat session context"
    },
    "autoCommit": {
      "type": "boolean",
      "description": "Boolean flag whether to create atomic git commits automatically"
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
    "commits": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of git commit SHAs created"
    },
    "diff": {
      "type": "string",
      "description": "Git diff showing applied changes"
    }
  }
}
```

## 7. Limitations
Requires Python environment; modifies git history directly unless `--no-git` is specified; overlaps with native Antigravity file editing tools.

## 8. Security & Sandboxing Concerns
Unattended git commits could commit sensitive keys or unwanted files if `.gitignore` is not strictly enforced.
