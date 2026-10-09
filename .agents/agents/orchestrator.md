---
name: orchestrator
description: "Legacy subagent alias. Defers to orchestration-agent-v4 (or orchestration-agent-v3 in rollback mode)."
mainAgent: false
subagent: true
hidden: true
tools:
  - view_file
  - write_to_file
  - replace_file_content
  - run_command
  - invoke_subagent
  - send_message
  - manage_subagents
  - manage_task
---

# Legacy Orchestrator Subagent Alias

> [!NOTE]
> This agent is preserved strictly for backwards compatibility.
> The single canonical universal primary orchestrator is **`orchestration-agent-v4`** (with `orchestration-agent-v3` as verified primary rollback baseline and `orchestration-agent-v2` as secondary baseline).
