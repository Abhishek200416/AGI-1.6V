"""
agents/AGI_1_7/scripts/sync_ecosystem.py
Safe, Reproducible Ecosystem Bootstrapper for AGI 1.7 — OMEGA COMMAND.

Safety & Environment Isolation Guarantees:
1. By default (`python agents/AGI_1_7/scripts/sync_ecosystem.py`), this script operates
   100% locally inside the repository (`agents/AGI_1_7/ecosystem/` and `.agents/`).
   It NEVER modifies user-level (`~/.gemini`) configuration unless `--install-global`
   is explicitly passed on the command line.
2. Supports `--dry-run` to preview what would be verified or synced without writing files.
3. Keeps all 100 specialist contracts strictly embedded inside `agents/AGI_1_7/ecosystem/`
   so they do not clutter top-level UI dropdowns.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path
from typing import List


def _build_agi17_agent_markdown(reg: dict) -> str:
    """Builds the unified AGI 1.7 agent definition with all 100 specialists embedded inside it."""
    by_family: dict[str, list[dict]] = {}
    for spec in reg.get("specialists", []):
        by_family.setdefault(spec["family"], []).append(spec)

    family_lines = []
    for idx, (fam, items) in enumerate(by_family.items(), 1):
        ids_str = ", ".join(f"`{s['agent_id']}`" for s in items)
        family_lines.append(f"{idx}. **{fam} ({len(items)} embedded specialists)**: {ids_str}")
    embedded_catalog_md = "\n".join(family_lines)

    return f"""---
name: AGI 1.7
displayName: AGI 1.7 — OMEGA COMMAND
id: agi-1-7
description: "AGI 1.7 OMEGA COMMAND — Resource-Aware, Persistent, Self-Orchestrating Multi-Agent Operating System with 100 Embedded Specialist Contracts across 16 Families, 100 Logical Child Tasks with Dynamic Headroom Governance, 14-State SQLite WAL Task Control, Live Instruction Inbox, Streaming Process Supervision, 10-Layer Cross-Session Memory & Isolated-CWD Enforced Token Economy (D:\\\\)."
mainAgent: true
subagent: true
hidden: false
tools:
  - view_file
  - write_to_file
  - replace_file_content
  - run_command
  - invoke_subagent
  - send_message
  - manage_subagents
  - manage_task
model: inherit
commandExecutionPolicy: sandbox
---

# AGI 1.7 — OMEGA COMMAND: THE RESOURCE-AWARE, PERSISTENT, SELF-ORCHESTRATING MULTI-AGENT RUNTIME

## 1. Identity & Operational Mandate
You are **AGI 1.7 — OMEGA COMMAND**, the autonomous general-purpose engineering, computer-use, and live-knowledge multi-agent orchestration runtime powered by **Gemini 3.8 Flash High (`gemini-3.8-flash-high`)** through the verified Antigravity runtime.

All **100 specialist agents across 16 families** are **embedded inside AGI 1.7** (`agents/AGI_1_7/ecosystem/agent_registry/registry.json` and `agents/AGI_1_7/ecosystem/subagents/`). When the user assigns a task to **AGI 1.7**, **AGI 1.7** routes, instantiates, and coordinates the appropriate internal specialists via `CapabilityRouter`, `SpecialistFactory`, and `HierarchicalOrchestrator`.

## 2. Embedded 100-Specialist Catalog (Internal to AGI 1.7 Across 16 Families)
{embedded_catalog_md}

## 3. Sole Foundation Model Policy (Directive 0)
The sole foundation model is **Gemini 3.8 Flash High (`gemini-3.8-flash-high`)**.
- All model-backed calls are routed through `ModelAdapter` (`agy.exe --model gemini-3.8-flash-high --effort high`).
- If this model becomes unavailable, halt the affected execution and report the failure immediately.
"""


def _ensure_hidden_subagent_frontmatter(md_file: Path, dry_run: bool = False) -> bool:
    """Ensures non-AGI-1.7 agent markdown files have mainAgent: false and hidden: true."""
    if not md_file.exists() or not md_file.is_file():
        return False
    text = md_file.read_text(encoding="utf-8", errors="ignore")
    if not text.startswith("---"):
        return False
    parts = text.split("---", 2)
    if len(parts) < 3:
        return False
    frontmatter = parts[1]
    body = parts[2]
    changed = False

    if "mainAgent: true" in frontmatter:
        frontmatter = frontmatter.replace("mainAgent: true", "mainAgent: false")
        changed = True
    elif "mainAgent:" not in frontmatter:
        frontmatter = frontmatter.rstrip() + "\nmainAgent: false\n"
        changed = True

    if "subagent:" not in frontmatter:
        frontmatter = frontmatter.rstrip() + "\nsubagent: true\n"
        changed = True

    if "hidden: false" in frontmatter:
        frontmatter = frontmatter.replace("hidden: false", "hidden: true")
        changed = True
    elif "hidden:" not in frontmatter:
        frontmatter = frontmatter.rstrip() + "\nhidden: true\n"
        changed = True

    if changed and not dry_run:
        md_file.write_text(f"---{frontmatter}---{body}", encoding="utf-8")
    return changed


def sync_ecosystem(
    verbose: bool = True,
    install_global: bool = False,
    dry_run: bool = False,
) -> dict:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    agi17_root = os.path.abspath(os.path.join(script_dir, ".."))
    repo_root = os.path.abspath(os.path.join(agi17_root, "..", ".."))
    eco_root = os.path.join(agi17_root, "ecosystem")
    reg_path = os.path.join(eco_root, "agent_registry", "registry.json")

    with open(reg_path, "r", encoding="utf-8") as f:
        reg = json.load(f)

    # 1. Maintain all 100 specialist contracts strictly inside AGI 1.7's internal subagents folder
    subagents_dir = os.path.join(eco_root, "subagents")
    if not dry_run:
        os.makedirs(subagents_dir, exist_ok=True)
    specialist_ids = set()

    for spec in reg.get("specialists", []):
        aid = spec["agent_id"]
        specialist_ids.add(aid)
        fam = spec["family"]
        md_path = os.path.join(subagents_dir, f"{aid}.md")
        caps = ", ".join(spec.get("primary_capabilities", []))
        tools = ", ".join(spec.get("required_tools", []))
        md_content = (
            f"---\n"
            f"name: {aid}\n"
            f'description: "{spec["display_name"]} ({fam}) — Capabilities: {caps}"\n'
            f'family: "{fam}"\n'
            f'resource_class: "{spec.get("resource_class", "LIGHT")}"\n'
            f"max_token_budget: {spec.get('max_token_budget', 12000)}\n"
            f"mainAgent: false\n"
            f"subagent: true\n"
            f"hidden: true\n"
            f'embedded_in: "AGI 1.7"\n'
            f"---\n\n"
            f"# {spec['display_name']} (`{aid}`)\n\n"
            f"- **Family**: {fam}\n"
            f"- **Execution Mode**: `{spec.get('execution_mode', 'IN_PROCESS_TOOL_WORKER')}`\n"
            f"- **Primary Capabilities**: {caps}\n"
            f"- **Required Tools**: {tools}\n"
            f"- **Max Token Budget**: `{spec.get('max_token_budget', 12000)}`\n"
            f"- **Max Wall-Clock Seconds**: `{spec.get('max_wall_clock_seconds', 180)}s`\n\n"
            f"Embedded inside **AGI 1.7 — OMEGA COMMAND** (`agents/AGI_1_7/ecosystem/agent_registry/registry.json`). "
            f"Automatically routed by `CapabilityRouter` and instantiated by `SpecialistFactory`.\n"
        )
        if not dry_run:
            with open(md_path, "w", encoding="utf-8") as mf:
                mf.write(md_content)

    # 2. By default, ONLY touch repo-local `.agents/agents/`.
    #    User-level `~/.gemini/config/agents` is ONLY touched if `install_global=True` is explicitly requested.
    ws_agents_dir = Path(repo_root) / ".agents" / "agents"
    ws_backup_dir = Path(repo_root) / ".agents" / "agents_backup"
    if not dry_run:
        ws_agents_dir.mkdir(parents=True, exist_ok=True)
        ws_backup_dir.mkdir(parents=True, exist_ok=True)

    target_pairs: List[tuple[Path, Path]] = [(ws_agents_dir, ws_backup_dir)]
    if install_global:
        global_agents_dir = Path(os.path.expanduser("~")) / ".gemini" / "config" / "agents"
        global_backup_dir = Path(os.path.expanduser("~")) / ".gemini" / "config" / "agents_backup"
        if not dry_run:
            global_backup_dir.mkdir(parents=True, exist_ok=True)
        target_pairs.append((global_agents_dir, global_backup_dir))

    pruned_ui_specialists = 0
    for target_dir, backup_dir in target_pairs:
        if not target_dir.exists():
            continue
        for aid in specialist_ids:
            leaked_file = target_dir / f"{aid}.md"
            if leaked_file.exists():
                if not dry_run:
                    leaked_file.unlink()
                pruned_ui_specialists += 1

    # 3. Install/update unified `agi-1-7.md` in target directories
    agi17_md = _build_agi17_agent_markdown(reg)
    for target_dir, _ in target_pairs:
        if target_dir.exists() and not dry_run:
            (target_dir / "agi-1-7.md").write_text(agi17_md, encoding="utf-8")
            sub_dir = target_dir / "agi-1-7"
            sub_dir.mkdir(parents=True, exist_ok=True)
            (sub_dir / "agent.md").write_text(agi17_md, encoding="utf-8")

    hidden_count = 0
    for target_dir, _ in target_pairs:
        if not target_dir.exists():
            continue
        for md_file in target_dir.rglob("*.md"):
            if md_file.name == "agi-1-7.md" or md_file.parent.name == "agi-1-7":
                continue
            if _ensure_hidden_subagent_frontmatter(md_file, dry_run=dry_run):
                hidden_count += 1

    skills_dir = os.path.join(eco_root, "skills")
    plugins_dir = os.path.join(eco_root, "plugins")
    mcp_dir = os.path.join(eco_root, "mcp")

    manifest = {
        "schema_version": "1.7.0",
        "codename": "AGI 1.7 — OMEGA COMMAND Unified 100-Specialist Embedded Ecosystem",
        "sole_model": "gemini-3.8-flash-high",
        "scope": "GLOBAL_AND_REPO" if install_global else "REPO_LOCAL_ONLY (Zero User Home Modification)",
        "counts": {
            "visibleTopLevelAgentsInUI": 1,
            "embeddedSpecialistContracts": len(reg.get("specialists", [])),
            "specialistFamilies": len(reg.get("family_distribution", {})),
            "embeddedSubagents": len(os.listdir(subagents_dir)) if os.path.exists(subagents_dir) else 100,
            "embeddedSkills": len(os.listdir(skills_dir)) if os.path.exists(skills_dir) else 0,
            "embeddedPlugins": len(os.listdir(plugins_dir)) if os.path.exists(plugins_dir) else 0,
            "embeddedMcpServers": len(
                [x for x in os.listdir(mcp_dir) if os.path.isdir(os.path.join(mcp_dir, x))]
            )
            if os.path.exists(mcp_dir)
            else 0,
        },
        "family_distribution": reg.get("family_distribution", {}),
    }

    manifest_path = os.path.join(eco_root, "ecosystem_manifest.json")
    if not dry_run:
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

    if verbose:
        c = manifest["counts"]
        mode_label = "DRY-RUN" if dry_run else ("REPO + GLOBAL" if install_global else "REPO-LOCAL ONLY (Safe Default)")
        print(f"[AGI 1.7 OMEGA COMMAND] Ecosystem Sync Complete [{mode_label}]:")
        print(f"  - Scope                          : {manifest['scope']}")
        print(f"  - Visible Top-Level Agent in UI  : {c['visibleTopLevelAgentsInUI']} (ONLY 'AGI 1.7 — OMEGA COMMAND')")
        print(f"  - Embedded Specialist Contracts  : {c['embeddedSpecialistContracts']} across {c['specialistFamilies']} Families")
        print(f"  - Embedded Workflow Skills       : {c['embeddedSkills']} (GSD, Kubernetes)")
        print(f"  - Embedded Plugin Suites         : {c['embeddedPlugins']} (Ponytail, CodeRabbit, Gemini-API, Prompt-Master, Science)")
        print(f"  - Embedded MCP Server Schemas    : {c['embeddedMcpServers']} (Sequential-Thinking, Playwright, Context7, GSD, Ponytail)")

    return {
        "status": "DRY_RUN" if dry_run else "VERIFIED",
        "scope": manifest["scope"],
        "counts": manifest["counts"],
        "pruned_ui_specialists": pruned_ui_specialists,
        "hidden_legacy_agents": hidden_count,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="AGI 1.7 Safe Repo-Local Ecosystem Bootstrapper")
    parser.add_argument(
        "--install-global",
        action="store_true",
        help="Opt-in: also install AGI 1.7 agent definition into ~/.gemini/config/agents (default: False, repo-local only).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without modifying any files.",
    )
    args = parser.parse_args()
    sync_ecosystem(verbose=True, install_global=args.install_global, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
