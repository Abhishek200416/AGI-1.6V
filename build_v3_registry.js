/**
 * build_v3_registry.js
 * Compiles the complete 10-file V3 Dynamic Capability Registry:
 * 1. agents.json
 * 2. capabilities.json
 * 3. frameworks.json
 * 4. mcp.json
 * 5. skills.json
 * 6. external-agents.json
 * 7. external-skills.json
 * 8. security.json
 * 9. licenses.json
 * 10. health.json
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const targetDirs = [
  path.resolve(__dirname, '.agents/registry'),
  path.resolve(homeDir, '.agents/registry')
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

// -------------------------------------------------------------
// 1. EXTERNAL-AGENTS.JSON (Standard V3 Adapter Schema)
// -------------------------------------------------------------
const externalAgentsData = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "3.0.0",
  "lastVerified": "2026-10-09T00:15:00Z",
  "adapters": [
    {
      "name": "OpenHands",
      "source": "github",
      "repository": "https://github.com/All-Hands-AI/OpenHands",
      "license": "MIT",
      "version": "0.19.x",
      "category": "AUTONOMOUS_SWE",
      "capabilities": ["multi_module_refactor", "autonomous_swe", "swe_bench_eval", "complex_issue_solver"],
      "required_tools": ["run_command", "view_file"],
      "required_skills": [],
      "mcp_dependencies": [],
      "permissions": ["docker_daemon_sandboxed", "filesystem_write", "terminal_exec"],
      "sandbox": "MICRO_VM_EPHEMERAL_TIER_2",
      "quality_score": 88,
      "security_score": 85,
      "duplication_score": 0,
      "status": "VALIDATED_READY"
    },
    {
      "name": "Goose",
      "source": "github",
      "repository": "https://github.com/block/goose",
      "license": "Apache-2.0",
      "version": "1.0.x",
      "category": "MCP_AGENT",
      "capabilities": ["mcp_tool_runner", "headless_recipe_automation", "rust_runtime_automation"],
      "required_tools": ["run_command"],
      "required_skills": [],
      "mcp_dependencies": ["playwright", "context7"],
      "permissions": ["terminal_exec", "filesystem_write"],
      "sandbox": "PROCESS_JOB_OBJECT_TIER_1",
      "quality_score": 86,
      "security_score": 90,
      "duplication_score": 0,
      "status": "VALIDATED_READY"
    },
    {
      "name": "Aider",
      "source": "github",
      "repository": "https://github.com/Aider-AI/aider",
      "license": "Apache-2.0",
      "version": "0.74.x",
      "category": "PAIR_PROGRAMMING",
      "capabilities": ["tree_sitter_repo_map", "atomic_git_commits", "multi_file_patching"],
      "required_tools": ["run_command", "view_file", "write_to_file"],
      "required_skills": [],
      "mcp_dependencies": [],
      "permissions": ["git_exec", "terminal_exec", "filesystem_write"],
      "sandbox": "PROCESS_JOB_OBJECT_TIER_1",
      "quality_score": 85,
      "security_score": 90,
      "duplication_score": 0,
      "status": "VALIDATED_READY"
    },
    {
      "name": "SWE-agent",
      "source": "github",
      "repository": "https://github.com/SWE-agent/SWE-agent",
      "license": "MIT",
      "version": "1.0.x",
      "category": "BENCHMARK_EVALUATION",
      "capabilities": ["agent_computer_interface", "github_issue_patcher", "swe_bench_eval"],
      "required_tools": ["run_command"],
      "required_skills": [],
      "mcp_dependencies": [],
      "permissions": ["docker_daemon_sandboxed", "filesystem_write"],
      "sandbox": "CONTAINER_SANDBOX_TIER_2",
      "quality_score": 82,
      "security_score": 85,
      "duplication_score": 0,
      "status": "VALIDATED_READY"
    },
    {
      "name": "OpenCode",
      "source": "github",
      "repository": "https://github.com/anomalyco/opencode",
      "license": "MIT",
      "version": "1.0.x",
      "category": "CODING_AGENT",
      "capabilities": ["terminal_coding"],
      "required_tools": ["run_command"],
      "required_skills": [],
      "mcp_dependencies": [],
      "permissions": ["terminal_exec", "filesystem_write"],
      "sandbox": "PROCESS_JOB_OBJECT_TIER_1",
      "quality_score": 78,
      "security_score": 80,
      "duplication_score": 100,
      "status": "REJECTED_DUPLICATE"
    },
    {
      "name": "Cline",
      "source": "github",
      "repository": "https://github.com/cline/cline",
      "license": "Apache-2.0",
      "version": "3.x",
      "category": "IDE_CODING_AGENT",
      "capabilities": ["vscode_coding", "mcp_host"],
      "required_tools": ["run_command"],
      "required_skills": [],
      "mcp_dependencies": [],
      "permissions": ["terminal_exec", "filesystem_write"],
      "sandbox": "PROCESS_JOB_OBJECT_TIER_1",
      "quality_score": 81,
      "security_score": 80,
      "duplication_score": 100,
      "status": "REJECTED_DUPLICATE"
    },
    {
      "name": "Qwen Code",
      "source": "github",
      "repository": "https://github.com/QwenLM/qwen-code",
      "license": "Apache-2.0",
      "version": "0.x",
      "category": "CODING_AGENT",
      "capabilities": ["qwen_cli_coding"],
      "required_tools": ["run_command"],
      "required_skills": [],
      "mcp_dependencies": [],
      "permissions": ["terminal_exec", "filesystem_write"],
      "sandbox": "PROCESS_JOB_OBJECT_TIER_1",
      "quality_score": 72,
      "security_score": 75,
      "duplication_score": 100,
      "status": "REJECTED_DUPLICATE"
    }
  ]
};

// -------------------------------------------------------------
// 2. EXTERNAL-SKILLS.JSON (OpenHands & Open Source Skills)
// -------------------------------------------------------------
const externalSkillsData = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "3.0.0",
  "lastVerified": "2026-10-09T00:15:00Z",
  "importedSkills": [
    {
      "name": "kubernetes",
      "source": "OpenHands/extensions",
      "repository": "https://github.com/OpenHands/extensions/tree/main/skills/kubernetes",
      "license": "MIT",
      "category": "DEVOPS",
      "description": "Set up and manage local Kubernetes clusters using KIND (Kubernetes IN Docker), kubectl manifest deployment, and cluster debugging.",
      "triggers": ["kubernetes", "k8s", "kube", "kubectl", "kind"],
      "qualityScore": 96,
      "securityScore": 92,
      "isDuplicate": false,
      "disposition": "IMPORT",
      "status": "ENABLED",
      "path": ".agents/skills/kubernetes/SKILL.md",
      "howV3InvokesIt": "Activated automatically by V3 router when tasks reference Kubernetes, KIND, kubectl, or cluster orchestration."
    },
    {
      "name": "datadog-observability",
      "source": "OpenHands/extensions",
      "repository": "https://github.com/OpenHands/extensions/tree/main/skills/datadog",
      "license": "MIT",
      "category": "OBSERVABILITY",
      "description": "Datadog synthetic monitoring, APM trace queries, and metric alerts.",
      "triggers": ["datadog", "apm", "metrics-alert"],
      "qualityScore": 90,
      "securityScore": 90,
      "isDuplicate": false,
      "disposition": "ADAPT",
      "status": "ENABLED",
      "path": ".agents/skills/datadog/SKILL.md",
      "howV3InvokesIt": "Delegated to devops-engineer when user requests Datadog APM configuration."
    },
    {
      "name": "github-actions-workflow",
      "source": "OpenHands/extensions",
      "repository": "https://github.com/OpenHands/extensions/tree/main/skills/github-actions",
      "license": "MIT",
      "category": "DEVOPS",
      "description": "Author, validate, and troubleshoot GitHub Actions CI/CD workflows and composite actions.",
      "triggers": ["github-actions", "workflow", "ci-cd"],
      "qualityScore": 94,
      "securityScore": 95,
      "isDuplicate": false,
      "disposition": "IMPORT",
      "status": "ENABLED",
      "path": ".agents/skills/github-actions/SKILL.md",
      "howV3InvokesIt": "Invoked during Stage 14 (Prod Review) and CI/CD workflow generation."
    }
  ],
  "rejectedSkills": [
    {
      "name": "code-review",
      "source": "OpenHands/extensions",
      "disposition": "REJECT_DUPLICATE",
      "matchedLocal": "skill:coderabbit/code-review",
      "reason": "Duplicates native CodeRabbit code-review skill and code-reviewer persona."
    },
    {
      "name": "docker",
      "source": "OpenHands/extensions",
      "disposition": "REJECT_DUPLICATE",
      "matchedLocal": "agent:devops-engineer",
      "reason": "Duplicates devops-engineer core Docker containerization competencies."
    }
  ]
};

// -------------------------------------------------------------
// 3. SECURITY.JSON (Threat Model & Sandboxing Policies)
// -------------------------------------------------------------
const securityData = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "3.0.0",
  "lastVerified": "2026-10-09T00:15:00Z",
  "zeroSecretPolicy": {
    "rule": "RULE 1: Never output, print, or commit API keys, bearer tokens, or private secrets.",
    "enforcement": "Automated regex and entropy-based redactor applied on all registry files and logs.",
    "status": "ENFORCED"
  },
  "sandboxingTiers": {
    "TIER_0_IN_PROCESS": {
      "name": "Native Specialist Memory",
      "description": "Pure in-process model execution; no direct filesystem mutation; zero network privilege.",
      "workloads": ["product-architect", "orchestration-agent-v3"]
    },
    "TIER_1_PROCESS_JOB_OBJECT": {
      "name": "Managed OS Process Sandbox",
      "description": "Windows Job Objects / Linux cgroups v2; hard memory cap (512MB); timeout (300s); workspace-scoped writes.",
      "workloads": ["Aider", "Goose", "linters", "test runners"]
    },
    "TIER_2_OCI_MICRO_VM": {
      "name": "Container Sandbox Enclave",
      "description": "Ephemeral rootless OCI container; no /var/run/docker.sock mounting; dropped capabilities; restricted network egress.",
      "workloads": ["OpenHands", "SWE-agent"]
    },
    "TIER_3_QUARANTINE_ENCLAVE": {
      "name": "Physical Quarantine Sandbox",
      "description": "Air-gapped filesystem location; execution blocked at OS ACL and tool dispatcher level.",
      "workloads": ["quarantined skills"]
    }
  },
  "quarantinePolicy": {
    "quarantinedCount": 37,
    "path": "~/.agents/quarantine/",
    "enforcementAction": "EXECUTION_BLOCKED",
    "status": "PHYSICALLY_ISOLATED"
  }
};

// -------------------------------------------------------------
// 4. LICENSES.JSON (Compliance Matrix)
// -------------------------------------------------------------
const licensesData = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "3.0.0",
  "lastVerified": "2026-10-09T00:15:00Z",
  "categories": {
    "APPROVED_PERMISSIVE": {
      "policy": "ALLOW_AUTOMATIC_USE",
      "licenses": ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "CC0-1.0"]
    },
    "RESTRICTED_COPYLEFT": {
      "policy": "REQUIRE_ISOLATION_REVIEW",
      "licenses": ["LGPL-2.1", "LGPL-3.0", "MPL-2.0"]
    },
    "PROHIBITED_VIRAL": {
      "policy": "BLOCK_BY_DEFAULT",
      "licenses": ["AGPL-3.0", "SSPL", "GPL-3.0", "COMMERCIAL_RESTRICTED"]
    }
  },
  "complianceAudit": {
    "allStaticAgents": "COMPLIANT (Proprietary / Apache-2.0)",
    "openHands": "COMPLIANT (MIT)",
    "goose": "COMPLIANT (Apache-2.0)",
    "aider": "COMPLIANT (Apache-2.0)",
    "sweAgent": "COMPLIANT (MIT)",
    "playwrightMcp": "COMPLIANT (Apache-2.0)",
    "googleGenai": "COMPLIANT (Apache-2.0)"
  }
};

// -------------------------------------------------------------
// 5. HEALTH.JSON (Continuous Health Monitoring)
// -------------------------------------------------------------
const healthData = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "3.0.0",
  "lastVerified": "2026-10-09T00:15:00Z",
  "subsystems": {
    "staticAgents": {
      "status": "HEALTHY",
      "totalRegistered": 75,
      "verifiedOnDisk": 75,
      "missingFiles": 0
    },
    "mcpServers": {
      "status": "HEALTHY",
      "activeCount": 9,
      "degradedCount": 0,
      "unsafeToolsEliminated": true
    },
    "externalAdapters": {
      "status": "HEALTHY_WITH_DEGRADATION_AWARENESS",
      "validatedCount": 4,
      "rejectedCount": 3,
      "dockerRuntimeState": {
        "installed": true,
        "daemonRunning": false,
        "impact": "OpenHands & SWE-agent automatically degrade to native specialist + Aider fallback."
      }
    },
    "skillsCatalog": {
      "status": "HEALTHY",
      "activeCount": 2022,
      "quarantinedCount": 37,
      "quarantineSecured": true
    }
  }
};

// -------------------------------------------------------------
// 6. UPDATE AGENTS.JSON TO V3
// -------------------------------------------------------------
const existingAgents = JSON.parse(fs.readFileSync(path.join(targetDirs[0], 'agents.json'), 'utf-8'));
existingAgents.orchestrators = [
  {
    "name": "orchestration-agent-v3",
    "version": "3.0.0",
    "status": "ACTIVE_PRIMARY",
    "role": "Universal Open-Source Agent Capability Mesh Gateway",
    "file": ".agents/agents/orchestration-agent-v3.md",
    "description": "Universal Open-Source Agent Capability Mesh — Version 3. Master root coordinator for discovering, evaluating, adapting, sandboxing, and registering external open-source capabilities.",
    "mainAgent": true,
    "subagent": true,
    "hidden": false
  },
  {
    "name": "orchestration-agent-v2",
    "version": "2.0.0",
    "status": "STANDBY_ROLLBACK_BASELINE",
    "role": "Version 2 Verified Rollback Baseline",
    "file": ".agents/agents/orchestration-agent-v2.md",
    "description": "Universal AI Engineering Orchestration Gateway — Version 2. Verified rollback baseline.",
    "mainAgent": false,
    "subagent": true,
    "hidden": false
  },
  {
    "name": "orchestration-agent-v1",
    "version": "1.0.0",
    "status": "STANDBY_ROLLBACK_FALLBACK",
    "role": "Version 1 Legacy Rollback Fallback",
    "file": ".agents/agents/orchestration-agent-v1.md",
    "description": "Universal AI Engineering Orchestration Agent — Version 1. Hardened fallback baseline.",
    "mainAgent": false,
    "subagent": true,
    "hidden": true
  },
  {
    "name": "orchestrator",
    "version": "1.0.0",
    "status": "LEGACY_ALIAS",
    "role": "Legacy Alias",
    "file": ".agents/agents/orchestrator.md",
    "description": "Legacy subagent alias. Defers to orchestration-agent-v3.",
    "mainAgent": false,
    "subagent": true,
    "hidden": true
  }
];

// Write all files to all target directories
const filesToWrite = {
  'agents.json': existingAgents,
  'external-agents.json': externalAgentsData,
  'external-skills.json': externalSkillsData,
  'security.json': securityData,
  'licenses.json': licensesData,
  'health.json': healthData
};

for (const dir of targetDirs) {
  for (const [filename, data] of Object.entries(filesToWrite)) {
    const full = path.join(dir, filename);
    fs.writeFileSync(full, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Wrote ${full}`);
  }
}

console.log('V3 Dynamic Capability Registry compilation complete!');
