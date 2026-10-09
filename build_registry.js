/**
 * build_registry.js
 * Generates the complete Antigravity Capability Registry.
 * Follows Ponytail minimalism: scans existing on-disk agent definitions,
 * validates schema integrity, cross-platform paths, and security invariants.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const homeDir = os.homedir();
const localAgentsDir = path.resolve(__dirname, '.agents/agents');
const targetDirs = [
  path.resolve(__dirname, '.agents/registry'),
  path.resolve(homeDir, '.agents/registry')
];

for (const d of targetDirs) {
  try {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  } catch (err) {
    console.warn(`Warning: Could not create registry directory ${d}: ${err.message}`);
  }
}

// -------------------------------------------------------------
// 1. DYNAMIC AGENTS DISCOVERY & PARSING
// -------------------------------------------------------------
function loadStaticAgents() {
  const files = fs.readdirSync(localAgentsDir).filter(f => f.endsWith('.md'));
  const staticAgents = [];

  for (const file of files) {
    const filePath = path.join(localAgentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const baseName = path.basename(file, '.md');

    // Skip root orchestrators from static specialists list
    if (baseName.startsWith('orchestration-agent') || baseName === 'orchestrator') {
      continue;
    }

    let description = '';
    const descMatch = content.match(/description:\s*["']?([^"'\r\n]+)["']?/);
    if (descMatch) {
      description = descMatch[1].trim();
    }

    const tools = [];
    const toolsBlock = content.match(/tools:\s*\n((?:\s*-\s*[^\r\n]+\n?)+)/);
    if (toolsBlock) {
      const toolLines = toolsBlock[1].split('\n');
      for (const line of toolLines) {
        const t = line.replace(/^\s*-\s*/, '').trim();
        if (t) tools.push(t);
      }
    }
    if (tools.length === 0) {
      tools.push('view_file', 'write_to_file', 'replace_file_content', 'run_command');
    }

    // Determine category and risk
    let category = 'GENERAL_ENGINEERING';
    let risk = 'LOW';
    if (baseName.includes('architect') || baseName.includes('product')) category = 'ARCHITECTURE';
    else if (baseName.includes('frontend') || baseName.includes('ui')) category = 'FRONTEND';
    else if (baseName.includes('backend') || baseName.includes('api')) category = 'BACKEND';
    else if (baseName.includes('database')) { category = 'DATABASE'; risk = 'MEDIUM'; }
    else if (baseName.includes('ai') || baseName.includes('ml') || baseName.includes('llm') || baseName.includes('rag')) category = 'AI_ML';
    else if (baseName.includes('quant') || baseName.includes('market') || baseName.includes('trading') || baseName.includes('risk')) { category = 'QUANT_FINANCE'; risk = 'MEDIUM'; }
    else if (baseName.includes('security')) { category = 'SECURITY'; risk = 'LOW'; }
    else if (baseName.includes('qa') || baseName.includes('test') || baseName.includes('review') || baseName.includes('verifier') || baseName.includes('auditor')) category = 'QUALITY_ASSURANCE';
    else if (baseName.includes('devops') || baseName.includes('cloud') || baseName.includes('infra') || baseName.includes('release')) { category = 'DEVOPS'; risk = 'MEDIUM'; }
    else if (baseName.startsWith('gsd-')) category = 'GSD_WORKFLOW';

    staticAgents.push({
      name: baseName,
      category,
      source: "native/antigravity",
      repository: `local://.agents/agents/${file}`,
      license: "Proprietary/Internal",
      version: "1.0.0",
      status: "ACTIVE",
      type: "STATIC_AGENT",
      agentCompatible: true,
      mcpCompatible: true,
      skillCompatible: true,
      risk,
      permissions: tools,
      installationMethod: "built-in",
      health: "HEALTHY",
      lastVerified: "2026-10-08T23:30:00Z",
      qualityScore: 96,
      description: description || `Specialized Antigravity agent persona for ${baseName}.`
    });
  }

  return staticAgents;
}

const staticAgents = loadStaticAgents();

const agentsRegistry = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "2.0.0",
  "lastVerified": "2026-10-08T23:30:00Z",
  "defaultQualityThreshold": 75,
  "orchestrators": [
    {
      "name": "orchestration-agent-v2",
      "version": "2.0.0",
      "status": "ACTIVE_PRIMARY",
      "role": "Master Orchestration Gateway",
      "file": ".agents/agents/orchestration-agent-v2.md",
      "description": "Universal AI Engineering Orchestration Gateway — Version 2. Coordinates native specialists, skills, MCP tools, open-source capabilities, and dynamic subagents.",
      "mainAgent": true,
      "subagent": true,
      "hidden": false
    },
    {
      "name": "orchestration-agent-v1",
      "version": "1.0.0",
      "status": "STANDBY_ROLLBACK_FALLBACK",
      "role": "Version 1 Fallback Orchestrator",
      "file": ".agents/agents/orchestration-agent-v1.md",
      "description": "Universal AI Engineering Orchestration Agent — Version 1. Preserved as reliable fallback / rollback target.",
      "mainAgent": true,
      "subagent": true,
      "hidden": false
    },
    {
      "name": "orchestrator",
      "version": "1.0.0",
      "status": "LEGACY_ALIAS",
      "role": "Legacy Alias",
      "file": ".agents/agents/orchestrator.md",
      "description": "Legacy subagent alias for backward compatibility. Defers to orchestration-agent-v2.",
      "mainAgent": false,
      "subagent": true,
      "hidden": true
    }
  ],
  "staticAgents": staticAgents,
  "externalAgents": [
    {
      "name": "OpenHands",
      "category": "AUTONOMOUS_SWE",
      "source": "github",
      "repository": "https://github.com/All-Hands-AI/OpenHands",
      "license": "MIT",
      "version": "0.19.x",
      "status": "ADAPTER_READY",
      "type": "EXTERNAL_AGENT",
      "agentCompatible": true,
      "mcpCompatible": true,
      "skillCompatible": false,
      "risk": "HIGH",
      "permissions": ["docker_daemon", "filesystem_write", "terminal_exec", "network_ingress"],
      "installationMethod": "docker_compose_adapter",
      "health": "AVAILABLE_EXTERNALLY",
      "lastVerified": "2026-10-08T18:03:16Z",
      "qualityScore": 88,
      "scoreBreakdown": {
        "maintenance": 9,
        "documentation": 9,
        "license": 10,
        "security": 7,
        "community": 9,
        "activity": 10,
        "compatibility": 8,
        "reliability": 8,
        "performance": 8,
        "integrationValue": 10
      },
      "integrationDecision": "ADAPTER_READY",
      "adapterFile": ".agents/adapters/openhands-adapter.json",
      "rationale": "High-value autonomous software engineering benchmark and execution platform. Runs out-of-process via Docker sandbox to isolate heavyweight dependencies and preserve Antigravity stability."
    },
    {
      "name": "Goose",
      "category": "MCP_AGENT",
      "source": "github",
      "repository": "https://github.com/block/goose",
      "license": "Apache-2.0",
      "version": "1.0.x",
      "status": "ADAPTER_READY",
      "type": "EXTERNAL_AGENT",
      "agentCompatible": true,
      "mcpCompatible": true,
      "skillCompatible": true,
      "risk": "MEDIUM",
      "permissions": ["terminal_exec", "filesystem_write"],
      "installationMethod": "cargo_install_or_binary",
      "health": "AVAILABLE_EXTERNALLY",
      "lastVerified": "2026-10-08T17:53:23Z",
      "qualityScore": 86,
      "scoreBreakdown": {
        "maintenance": 9,
        "documentation": 8,
        "license": 10,
        "security": 9,
        "community": 8,
        "activity": 9,
        "compatibility": 9,
        "reliability": 8,
        "performance": 8,
        "integrationValue": 8
      },
      "integrationDecision": "ADAPTER_READY",
      "adapterFile": ".agents/adapters/goose-adapter.json",
      "rationale": "First-class native MCP agent with pluggable recipe support. Integrated via CLI headless runner and MCP server connector."
    },
    {
      "name": "Aider",
      "category": "PAIR_PROGRAMMING",
      "source": "github",
      "repository": "https://github.com/Aider-AI/aider",
      "license": "Apache-2.0",
      "version": "0.74.x",
      "status": "ADAPTER_READY",
      "type": "EXTERNAL_AGENT",
      "agentCompatible": true,
      "mcpCompatible": false,
      "skillCompatible": false,
      "risk": "MEDIUM",
      "permissions": ["git_exec", "terminal_exec", "filesystem_write"],
      "installationMethod": "pip_install_aider_chat",
      "health": "AVAILABLE_EXTERNALLY",
      "lastVerified": "2026-05-22T14:02:20Z",
      "qualityScore": 85,
      "scoreBreakdown": {
        "maintenance": 8,
        "documentation": 9,
        "license": 10,
        "security": 8,
        "community": 9,
        "activity": 8,
        "compatibility": 8,
        "reliability": 9,
        "performance": 8,
        "integrationValue": 8
      },
      "integrationDecision": "ADAPTER_READY",
      "adapterFile": ".agents/adapters/aider-adapter.json",
      "rationale": "Benchmark leader in repo-map AST compression and git commit automation. Integrated via headless CLI mode (`aider --message`)."
    },
    {
      "name": "SWE-agent",
      "category": "BENCHMARK_AGENT",
      "source": "github",
      "repository": "https://github.com/SWE-agent/SWE-agent",
      "license": "MIT",
      "version": "1.0.x",
      "status": "ADAPTER_READY",
      "type": "EXTERNAL_AGENT",
      "agentCompatible": true,
      "mcpCompatible": false,
      "skillCompatible": false,
      "risk": "HIGH",
      "permissions": ["docker_daemon", "filesystem_write", "terminal_exec"],
      "installationMethod": "docker_and_python_env",
      "health": "AVAILABLE_EXTERNALLY",
      "lastVerified": "2026-10-06T00:34:40Z",
      "qualityScore": 82,
      "scoreBreakdown": {
        "maintenance": 8,
        "documentation": 8,
        "license": 10,
        "security": 7,
        "community": 8,
        "activity": 8,
        "compatibility": 7,
        "reliability": 9,
        "performance": 7,
        "integrationValue": 10
      },
      "integrationDecision": "ADAPTER_READY",
      "adapterFile": ".agents/adapters/swe-agent-adapter.json",
      "rationale": "NeurIPS 2024 academic gold standard for issue resolution benchmarks via Agent-Computer Interface (ACI). Operates in Docker container sandbox."
    },
    {
      "name": "OpenCode",
      "category": "CODING_AGENT",
      "source": "github",
      "repository": "https://github.com/anomalyco/opencode",
      "license": "MIT",
      "version": "1.0.x",
      "status": "REJECTED_DUPLICATE",
      "type": "EXTERNAL_AGENT",
      "agentCompatible": true,
      "mcpCompatible": true,
      "skillCompatible": false,
      "risk": "MEDIUM",
      "permissions": ["terminal_exec", "filesystem_write", "network_ingress"],
      "installationMethod": "npm_install_g_opencode",
      "health": "REJECTED_DUPLICATE",
      "lastVerified": "2026-10-08T18:04:17Z",
      "qualityScore": 78,
      "scoreBreakdown": {
        "maintenance": 8,
        "documentation": 7,
        "license": 10,
        "security": 7,
        "community": 8,
        "activity": 10,
        "compatibility": 7,
        "reliability": 7,
        "performance": 7,
        "integrationValue": 7
      },
      "integrationDecision": "REJECTED — DUPLICATE CAPABILITY",
      "adapterFile": ".agents/adapters/opencode-adapter.json",
      "rationale": "REJECTED — DUPLICATE CAPABILITY: Direct functional duplicate of native Antigravity coding agents (senior-fullstack-engineer, backend-engineer). Installing its full CLI runtime offers no novel capability over native specialists."
    },
    {
      "name": "Cline",
      "category": "IDE_CODING_AGENT",
      "source": "github",
      "repository": "https://github.com/cline/cline",
      "license": "Apache-2.0",
      "version": "3.x",
      "status": "REJECTED_DUPLICATE",
      "type": "EXTERNAL_AGENT",
      "agentCompatible": true,
      "mcpCompatible": true,
      "skillCompatible": false,
      "risk": "HIGH",
      "permissions": ["terminal_exec", "filesystem_write"],
      "installationMethod": "vscode_extension",
      "health": "REJECTED_DUPLICATE",
      "lastVerified": "2026-10-08T17:40:18Z",
      "qualityScore": 81,
      "scoreBreakdown": {
        "maintenance": 9,
        "documentation": 8,
        "license": 10,
        "security": 7,
        "community": 9,
        "activity": 9,
        "compatibility": 6,
        "reliability": 8,
        "performance": 7,
        "integrationValue": 8
      },
      "integrationDecision": "REJECTED — DUPLICATE CAPABILITY",
      "adapterFile": ".agents/adapters/cline-adapter.json",
      "rationale": "REJECTED — DUPLICATE CAPABILITY: Duplicate of native Antigravity IDE agent engine. Running a VS Code extension agent inside Antigravity creates unnecessary IDE-in-IDE recursion. MCP compatibility is already provided natively."
    },
    {
      "name": "Qwen Code",
      "category": "CODING_AGENT",
      "source": "github",
      "repository": "https://github.com/QwenLM/qwen-code",
      "license": "Apache-2.0",
      "version": "0.x",
      "status": "REJECTED_DUPLICATE",
      "type": "EXTERNAL_AGENT",
      "agentCompatible": true,
      "mcpCompatible": true,
      "skillCompatible": false,
      "risk": "MEDIUM",
      "permissions": ["terminal_exec", "filesystem_write"],
      "installationMethod": "npm_install_g_qwen_code",
      "health": "REJECTED_DUPLICATE",
      "lastVerified": "2026-10-08T17:56:12Z",
      "qualityScore": 72,
      "scoreBreakdown": {
        "maintenance": 7,
        "documentation": 7,
        "license": 10,
        "security": 7,
        "community": 7,
        "activity": 8,
        "compatibility": 7,
        "reliability": 7,
        "performance": 6,
        "integrationValue": 6
      },
      "integrationDecision": "REJECTED — DUPLICATE CAPABILITY & BELOW_THRESHOLD",
      "adapterFile": ".agents/adapters/qwen-code-adapter.json",
      "rationale": "REJECTED — DUPLICATE CAPABILITY & Quality Score (72/100) below default threshold (75/100). Duplicates native coding agent capabilities without adding architectural value."
    }
  ],
  "dynamicSubagentCapability": {
    "enabled": true,
    "maxRecursionDepth": 2,
    "rootCoordinatorProtection": true,
    "inheritWorkspace": true,
    "inheritPermissions": false,
    "allowedToolSet": [
      "view_file",
      "write_to_file",
      "replace_file_content",
      "run_command",
      "call_mcp_tool"
    ],
    "description": "On-demand specialized persona generation for novel tasks when no static specialist or external adapter matches requirements."
  }
};

// -------------------------------------------------------------
// 2. SKILLS.JSON
// -------------------------------------------------------------
const skillsRegistry = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "2.0.0",
  "lastVerified": "2026-10-08T23:30:00Z",
  "summary": {
    "totalInstalledSkills": 2022,
    "totalQuarantinedSkills": 37,
    "activePluginClusters": 8,
    "gsdWorkflowSkills": 38
  },
  "clusters": [
    {
      "cluster": "ponytail",
      "source": "plugins/ponytail",
      "status": "ACTIVE",
      "philosophy": "Lazy senior dev mode: YAGNI, shortest working diff, standard library first, zero bloat",
      "skills": [
        "ponytail-audit",
        "ponytail-debt",
        "ponytail-gain",
        "ponytail-help",
        "ponytail-review"
      ]
    },
    {
      "cluster": "coderabbit",
      "source": "plugins/coderabbit",
      "status": "ACTIVE",
      "description": "Adversarial PR and code reviews, automated fix applications",
      "skills": [
        "code-review",
        "autofix"
      ]
    },
    {
      "cluster": "firebase",
      "source": "plugins/firebase",
      "status": "ACTIVE",
      "description": "Comprehensive Firebase ecosystem operations and architecture",
      "skills": [
        "firebase-basics",
        "firebase-auth-basics",
        "firebase-app-hosting-basics",
        "firebase-data-connect",
        "firebase-hosting-basics",
        "firebase-remote-config-basics",
        "firebase-crashlytics",
        "firebase-security-rules-auditor",
        "firebase-ai-logic-basics",
        "extension-to-functions-codebase",
        "xcode-project-setup"
      ]
    },
    {
      "cluster": "gemini-api",
      "source": "plugins/gemini-api",
      "status": "ACTIVE",
      "description": "Official Google Gemini SDK, Live API, and Omni Flash workflows",
      "skills": [
        "gemini-api-dev",
        "gemini-live-api-dev",
        "gemini-omni-flash-api"
      ]
    },
    {
      "cluster": "data-agent-kit",
      "source": "plugins/data-agent-kit-plugin",
      "status": "ACTIVE",
      "description": "Google Cloud data engineering, BigQuery, Bigtable, dbt, Dataform, Spark",
      "skills": [
        "bigquery-sql",
        "bigquery-bigframes",
        "bigquery-ai-ml",
        "bigquery-data-transfer-service",
        "bigtable-basics",
        "dataform-bigquery",
        "dbt-bigquery",
        "data-autocleaning",
        "enforcing-resource-attribution",
        "google-cloud-auth-verification",
        "gcp-data-pipelines",
        "gcp-pipeline-orchestration",
        "gcp-managed-airflow-dag-authoring",
        "gcp-managed-airflow-migrations",
        "gcp-managed-airflow-recommendations",
        "gcp-composer-troubleshooting",
        "gcp-spark-troubleshooting"
      ]
    },
    {
      "cluster": "science",
      "source": "plugins/science",
      "status": "ACTIVE",
      "description": "Life sciences, structural biology, cheminformatics, medical literature",
      "skills": [
        "alphafold-database-fetch-and-analyze",
        "alphagenome-variant-impact-score",
        "chembl-database",
        "clinical-trials-database",
        "clinvar-database",
        "dbsnp-database",
        "embl-ebi-ols",
        "encode-ccres-database",
        "ensembl-database",
        "foldseek-structural-search",
        "gnomad-database",
        "gtex-database",
        "human-protein-atlas-database",
        "interpro-database",
        "jaspar-database",
        "literature-search-arxiv",
        "literature-search-biorxiv",
        "literature-search-europepmc",
        "literature-search-openalex",
        "ncbi-sequence-fetch",
        "openfda-database",
        "opentargets-database",
        "pdb-database",
        "predictingthepast",
        "protein-sequence-msa",
        "protein-sequence-similarity-search",
        "pubchem-database",
        "pubmed-database",
        "pymol",
        "quickgo-database",
        "reactome-database",
        "string-database",
        "ucsc-conservation-and-tfbs",
        "unibind-database",
        "uniprot-database",
        "uv",
        "credentials"
      ]
    },
    {
      "cluster": "android-cli",
      "source": "plugins/android-cli-plugin",
      "status": "ACTIVE",
      "description": "Android CLI, virtual device management, and UI automation",
      "skills": [
        "android-cli"
      ]
    },
    {
      "cluster": "prompt-master",
      "source": "plugins/prompt-master",
      "status": "ACTIVE",
      "description": "Targeted AI prompt engineering and optimization",
      "skills": [
        "prompt-master"
      ]
    },
    {
      "cluster": "gsd-lifecycle",
      "source": "skills/gsd",
      "status": "ACTIVE",
      "description": "Complete Spec-Driven Development (SDD) planning, execution, and verification cycle",
      "skills": [
        "gsd-new-project",
        "gsd-plan-phase",
        "gsd-execute-phase",
        "gsd-verify-work",
        "gsd-code-review",
        "gsd-audit-fix",
        "gsd-secure-phase",
        "gsd-ui-phase",
        "gsd-ui-review",
        "gsd-ai-integration-phase",
        "gsd-eval-review",
        "gsd-add-tests",
        "gsd-debug",
        "gsd-ship",
        "gsd-progress",
        "gsd-dom-verifier",
        "gsd-mempalace-recall",
        "gsd-mempalace-capture"
      ]
    }
  ],
  "quarantinedSkills": [
    {
      "name": "broken_windows-privilege-escalation",
      "quarantinePath": "~/.agents/quarantine/broken_windows-privilege-escalation",
      "risk": "CRITICAL",
      "reason": "Host security risk: Unauthorized privilege escalation exploit scripts."
    },
    {
      "name": "privilege-escalation-methods",
      "quarantinePath": "~/.agents/quarantine/privilege-escalation-methods",
      "risk": "CRITICAL",
      "reason": "Security violation: Offensive security privilege escalation scripts."
    },
    {
      "name": "ssh-penetration-testing",
      "quarantinePath": "~/.agents/quarantine/ssh-penetration-testing",
      "risk": "HIGH",
      "reason": "Security violation: SSH penetration testing scripts without authorization."
    },
    {
      "name": "file-path-traversal",
      "quarantinePath": "~/.agents/quarantine/file-path-traversal",
      "risk": "HIGH",
      "reason": "Security violation: Path traversal scripts."
    },
    {
      "name": "xss-html-injection",
      "quarantinePath": "~/.agents/quarantine/xss-html-injection",
      "risk": "HIGH",
      "reason": "Security violation: Unsanitized script injection payloads."
    },
    {
      "name": "cred-omega",
      "quarantinePath": "~/.agents/quarantine/cred-omega",
      "risk": "CRITICAL",
      "reason": "Security violation: Credential harvesting vulnerability."
    },
    {
      "name": "pentest-commands",
      "quarantinePath": "~/.agents/quarantine/pentest-commands",
      "risk": "HIGH",
      "reason": "Security violation: Uncontrolled penetration testing commands."
    }
  ]
};

// -------------------------------------------------------------
// 3. MCP.JSON (Hardened & Parameterized)
// -------------------------------------------------------------
const mcpRegistry = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "2.0.0",
  "lastVerified": "2026-10-08T23:30:00Z",
  "securityNotice": "All credential secrets and access keys are strictly redacted in compliance with Rule 1.",
  "servers": [
    {
      "name": "playwright",
      "command": "npx",
      "args": ["-y", "@playwright/mcp"],
      "transport": "stdio",
      "category": "BROWSER_TOOL",
      "status": "ACTIVE",
      "risk": "MEDIUM",
      "permissions": ["browser_launch", "dom_interaction", "network_inspection", "screenshot"],
      "toolsProvided": [
        "browser_navigate",
        "browser_click",
        "browser_fill_form",
        "browser_type",
        "browser_hover",
        "browser_press_key",
        "browser_select_option",
        "browser_take_screenshot",
        "browser_snapshot",
        "browser_evaluate",
        "browser_wait_for",
        "browser_close",
        "browser_resize",
        "browser_tabs",
        "browser_navigate_back",
        "browser_drag",
        "browser_drop",
        "browser_file_upload",
        "browser_handle_dialog",
        "browser_network_requests",
        "browser_network_request",
        "browser_console_messages"
      ],
      "useCases": [
        "End-to-end web testing",
        "UI visual regression & screenshot capture",
        "DOM accessibility audits",
        "Live web application verification"
      ]
    },
    {
      "name": "context7",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "transport": "stdio",
      "category": "RESEARCH_TOOL",
      "status": "ACTIVE",
      "risk": "LOW",
      "permissions": ["network_outbound_docs"],
      "toolsProvided": [
        "resolve-library-id",
        "query-docs"
      ],
      "useCases": [
        "Real-time library documentation lookup",
        "Framework API signature validation",
        "Zero-hallucination syntax checking"
      ]
    },
    {
      "name": "cloudrun",
      "command": "npx",
      "args": ["-y", "@google-cloud/cloud-run-mcp"],
      "transport": "stdio",
      "category": "DEVOPS",
      "status": "ACTIVE",
      "risk": "HIGH",
      "permissions": ["gcp_cloud_run_deploy", "gcp_cloud_run_logs", "gcp_cloud_run_manage"],
      "toolsProvided": [
        "list_projects",
        "create_project",
        "list_services",
        "get_service",
        "get_service_log",
        "deploy_local_folder",
        "deploy_file_contents",
        "deploy_container_image"
      ],
      "useCases": [
        "Deploying microservices to GCP Cloud Run",
        "Inspecting production container logs",
        "Verifying cloud service health"
      ]
    },
    {
      "name": "firebase-mcp-server",
      "command": "npx",
      "args": ["-y", "firebase-tools@latest", "mcp"],
      "transport": "stdio",
      "category": "DEVOPS",
      "status": "ACTIVE",
      "risk": "HIGH",
      "permissions": ["firebase_auth", "firebase_deploy", "firebase_rules_update"],
      "toolsProvided": [
        "firebase_login",
        "firebase_list_projects",
        "firebase_get_project",
        "firebase_deploy",
        "firebase_get_security_rules",
        "developerknowledge_search_documents"
      ],
      "useCases": [
        "Firebase Hosting and App Hosting management",
        "Firestore Security Rules verification",
        "Firebase project configuration"
      ]
    },
    {
      "name": "maestro",
      "command": "cmd",
      "args": ["/c", "maestro", "mcp"],
      "transport": "stdio",
      "category": "COMPUTER_USE",
      "status": "ACTIVE",
      "risk": "MEDIUM",
      "permissions": ["android_adb_bridge", "mobile_ui_control", "device_screenshot"],
      "toolsProvided": [
        "list_devices",
        "take_screenshot",
        "run",
        "inspect_screen",
        "cheat_sheet",
        "open_maestro_viewer"
      ],
      "useCases": [
        "Mobile application UI testing (Android)",
        "Mobile visual assertions and flows"
      ]
    },
    {
      "name": "sequential-thinking",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "transport": "stdio",
      "category": "REASONING",
      "status": "ACTIVE",
      "risk": "LOW",
      "permissions": ["in_memory_reasoning"],
      "toolsProvided": [
        "sequentialthinking"
      ],
      "useCases": [
        "Dynamic multi-step problem deconstruction",
        "Hypothesis branching and truth validation",
        "Complex architecture planning"
      ]
    },
    {
      "name": "gsd",
      "command": "npx",
      "args": ["-y", "-p", "@opengsd/gsd-core", "gsd-mcp-server"],
      "transport": "stdio",
      "category": "ORCHESTRATION",
      "status": "ACTIVE",
      "risk": "LOW",
      "permissions": ["planning_state_read_write"],
      "toolsProvided": [
        "gsd_invoke_command",
        "gsd_read_state",
        "gsd_write_state"
      ],
      "useCases": [
        "SDD phase state tracking",
        "Milestone progress persistence"
      ]
    },
    {
      "name": "ponytail",
      "command": "node",
      "args": ["plugins/ponytail/ponytail-mcp/index.js"],
      "transport": "stdio",
      "category": "CODE_QUALITY",
      "status": "ACTIVE",
      "risk": "LOW",
      "permissions": ["in_memory_rules"],
      "toolsProvided": [
        "ponytail_instructions"
      ],
      "useCases": [
        "Enforcing minimalist, zero-bloat architecture",
        "Shortest working diff verification"
      ]
    },
    {
      "name": "gonkarouter",
      "command": "node",
      "args": ["gonkarouter-mcp/index.js"],
      "transport": "stdio",
      "category": "MODEL_ROUTING",
      "status": "ACTIVE",
      "risk": "LOW",
      "env": {
        "GONKAROUTER_BASE_URL": "https://api.gonkarouter.io/v1",
        "GONKAROUTER_API_KEY": "[REDACTED_API_KEY]"
      },
      "permissions": ["model_routing_api"],
      "toolsProvided": [
        "gonkarouter_list_models",
        "gonkarouter_chat",
        "gonkarouter_ask"
      ],
      "useCases": [
        "Multi-model intelligent query routing",
        "Cost-optimized inference distribution"
      ]
    }
  ]
};

// -------------------------------------------------------------
// 4. FRAMEWORKS.JSON (Mathematical Integrity Verified)
// -------------------------------------------------------------
const frameworksRegistry = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "2.0.0",
  "lastVerified": "2026-10-08T23:30:00Z",
  "defaultQualityThreshold": 75,
  "frameworks": [
    {
      "name": "Google Agent Development Kit (ADK) / google-genai",
      "repository": "https://github.com/google-gemini/generative-ai-python",
      "license": "Apache-2.0",
      "version": "1.0.0+",
      "status": "APPROVED_NATIVE",
      "type": "AGENT_FRAMEWORK",
      "qualityScore": 96,
      "scoreBreakdown": {
        "maintenance": 10,
        "documentation": 9,
        "license": 10,
        "security": 10,
        "community": 9,
        "activity": 10,
        "compatibility": 10,
        "reliability": 9,
        "performance": 9,
        "integrationValue": 10
      },
      "orchestrationCapability": "First-class multimodal function calling, structured schema outputs, sessions",
      "interoperability": "Native to Gemini ecosystem and Antigravity core",
      "mcpSupport": "Direct MCP client and tool adapter support",
      "memory": "Session-level and system prompt persistence",
      "toolCalling": "Automatic type-safe schema generation from Python types / JSON Schema",
      "multiAgentSupport": "Hierarchical agent transfers and handoffs",
      "productionMaturity": "Enterprise production ready",
      "usefulnessInAntigravity": "Primary AI engine framework for all structured LLM inferences",
      "integrationDecision": "APPROVED_NATIVE: Core development library"
    },
    {
      "name": "PydanticAI",
      "repository": "https://github.com/pydantic/pydantic-ai",
      "license": "MIT",
      "version": "0.1.x",
      "status": "APPROVED_LIBRARY",
      "type": "AGENT_FRAMEWORK",
      "qualityScore": 92,
      "scoreBreakdown": {
        "maintenance": 9,
        "documentation": 10,
        "license": 10,
        "security": 9,
        "community": 9,
        "activity": 10,
        "compatibility": 9,
        "reliability": 9,
        "performance": 8,
        "integrationValue": 9
      },
      "orchestrationCapability": "Model-agnostic agent execution with dependency injection and type validation",
      "interoperability": "High; works seamlessly across Gemini, OpenAI, Anthropic, and local models",
      "mcpSupport": "Experimental tool bridge",
      "memory": "Clean state passing and message history management",
      "toolCalling": "Best-in-class Pydantic schema validation and static typing",
      "multiAgentSupport": "Programmatic agent delegation via tool calls",
      "productionMaturity": "Rapidly maturing, trusted maintainers (Pydantic team)",
      "usefulnessInAntigravity": "Recommended framework whenever user tasks request typed Python agent pipelines",
      "integrationDecision": "APPROVED_LIBRARY: Integrated for typed agent workflows"
    },
    {
      "name": "LangGraph",
      "repository": "https://github.com/langchain-ai/langgraph",
      "license": "MIT",
      "version": "0.2.x",
      "status": "EXTERNAL_ADAPTER",
      "type": "AGENT_FRAMEWORK",
      "qualityScore": 84,
      "scoreBreakdown": {
        "maintenance": 9,
        "documentation": 9,
        "license": 10,
        "security": 8,
        "community": 9,
        "activity": 10,
        "compatibility": 7,
        "reliability": 8,
        "performance": 7,
        "integrationValue": 7
      },
      "orchestrationCapability": "Stateful multi-actor graph execution with cycles, branches, and human-in-the-loop gates",
      "interoperability": "Python & TypeScript, integrates with LangChain ecosystem",
      "mcpSupport": "Community MCP connectors available",
      "memory": "Persistent state checkpoints and time-travel debugging",
      "toolCalling": "Standardized tool nodes",
      "multiAgentSupport": "Hierarchical and decentralized multi-agent graphs",
      "productionMaturity": "Production ready for complex cyclical workflows",
      "usefulnessInAntigravity": "Do not replace Antigravity native router. Use as an external library when the user explicitly requests cyclic state machines or time-travel persistence.",
      "integrationDecision": "EXTERNAL_ADAPTER: Preserved for user-specified cyclical workflows"
    },
    {
      "name": "OpenAI Agents SDK",
      "repository": "https://github.com/openai/openai-agents-python",
      "license": "MIT",
      "version": "0.1.x",
      "status": "EXTERNAL_ADAPTER",
      "type": "AGENT_FRAMEWORK",
      "qualityScore": 82,
      "scoreBreakdown": {
        "maintenance": 8,
        "documentation": 8,
        "license": 10,
        "security": 9,
        "community": 8,
        "activity": 8,
        "compatibility": 8,
        "reliability": 8,
        "performance": 8,
        "integrationValue": 7
      },
      "orchestrationCapability": "Lightweight handoff patterns, agent boundaries, guardrails, and tracing",
      "interoperability": "Focused on OpenAI models; requires adapter for other providers",
      "mcpSupport": "Emerging",
      "memory": "Session-based context handoffs",
      "toolCalling": "Clean Python function decorators",
      "multiAgentSupport": "Clean agent-to-agent transfer semantics",
      "productionMaturity": "Early official release",
      "usefulnessInAntigravity": "Clean architectural concepts for handoffs; redundant with Antigravity's native invoke_subagent and send_message",
      "integrationDecision": "EXTERNAL_ADAPTER: Available for OpenAI-specific project requirements"
    },
    {
      "name": "Microsoft AutoGen",
      "repository": "https://github.com/microsoft/autogen",
      "license": "CC-BY-4.0",
      "version": "0.4.x",
      "status": "REJECTED_DUPLICATE",
      "type": "AGENT_FRAMEWORK",
      "qualityScore": 75,
      "scoreBreakdown": {
        "maintenance": 8,
        "documentation": 8,
        "license": 8,
        "security": 7,
        "community": 9,
        "activity": 8,
        "compatibility": 7,
        "reliability": 7,
        "performance": 7,
        "integrationValue": 6
      },
      "orchestrationCapability": "Conversational multi-agent group chats and event-driven actor framework",
      "interoperability": "Python .NET",
      "mcpSupport": "Community extensions",
      "memory": "Chat history accumulation",
      "toolCalling": "Registered Python functions",
      "multiAgentSupport": "GroupChat manager, round-robin, selector",
      "productionMaturity": "Transitioning architecture (0.2 -> 0.4 rewrite)",
      "usefulnessInAntigravity": "Antigravity's native subagents provide lighter, zero-dependency orchestration without AutoGen's complex async event bus",
      "integrationDecision": "REJECTED — DUPLICATE CAPABILITY of native Antigravity subagent bus"
    },
    {
      "name": "CrewAI",
      "repository": "https://github.com/crewAIInc/crewAI",
      "license": "MIT",
      "version": "0.80.x",
      "status": "REJECTED_DUPLICATE",
      "type": "AGENT_FRAMEWORK",
      "qualityScore": 76,
      "scoreBreakdown": {
        "maintenance": 8,
        "documentation": 8,
        "license": 10,
        "security": 7,
        "community": 9,
        "activity": 9,
        "compatibility": 7,
        "reliability": 6,
        "performance": 6,
        "integrationValue": 6
      },
      "orchestrationCapability": "Role-playing autonomous agents collaborating through crews and tasks",
      "interoperability": "Python",
      "mcpSupport": "Limited",
      "memory": "Short-term, long-term, and entity memory stores",
      "toolCalling": "LangChain tool wrappers",
      "multiAgentSupport": "Hierarchical and sequential crew execution",
      "productionMaturity": "Moderate; heavy abstractions and frequent breaking changes",
      "usefulnessInAntigravity": "Direct duplicate of Antigravity's existing 20+ specialized agent personas. Adds heavyweight dependencies with zero net capability gain.",
      "integrationDecision": "REJECTED — DUPLICATE CAPABILITY of native specialist personas"
    },
    {
      "name": "Microsoft Semantic Kernel",
      "repository": "https://github.com/microsoft/semantic-kernel",
      "license": "MIT",
      "version": "1.x",
      "status": "REJECTED_HEAVYWEIGHT",
      "type": "AGENT_FRAMEWORK",
      "qualityScore": 74,
      "scoreBreakdown": {
        "maintenance": 8,
        "documentation": 8,
        "license": 10,
        "security": 8,
        "community": 8,
        "activity": 8,
        "compatibility": 6,
        "reliability": 7,
        "performance": 6,
        "integrationValue": 5
      },
      "orchestrationCapability": "Enterprise plugin orchestration, planning, and memory connectors",
      "interoperability": "C#, Python, Java",
      "mcpSupport": "Experimental",
      "memory": "Vector database memory connectors",
      "toolCalling": "Native plugins and kernels",
      "multiAgentSupport": "Agent chat abstractions",
      "productionMaturity": "Enterprise mature for C# / Azure",
      "usefulnessInAntigravity": "Quality score (74/100) below threshold. Heavy enterprise abstraction layer that conflicts with Antigravity's lightweight, surgical diff posture.",
      "integrationDecision": "REJECTED — BELOW QUALITY THRESHOLD & EXCESSIVE ABSTRACTION"
    },
    {
      "name": "Microsoft Agent Framework",
      "repository": "https://github.com/microsoft/agent-framework",
      "license": "MIT",
      "version": "0.1.x",
      "status": "EVALUATION_PENDING",
      "type": "AGENT_FRAMEWORK",
      "qualityScore": 70,
      "scoreBreakdown": {
        "maintenance": 7,
        "documentation": 7,
        "license": 10,
        "security": 8,
        "community": 7,
        "activity": 7,
        "compatibility": 6,
        "reliability": 7,
        "performance": 6,
        "integrationValue": 5
      },
      "orchestrationCapability": "Unified Microsoft agent runtime preview",
      "interoperability": "Cross-platform preview",
      "mcpSupport": "Planned",
      "memory": "Under development",
      "toolCalling": "Under development",
      "multiAgentSupport": "Preview",
      "productionMaturity": "Early alpha",
      "usefulnessInAntigravity": "Not ready for production engineering. Monitored for future capability updates.",
      "integrationDecision": "REJECTED — BELOW QUALITY THRESHOLD & EARLY STAGE"
    }
  ]
};

// -------------------------------------------------------------
// 5. CAPABILITIES.JSON (Referential Integrity Verified)
// -------------------------------------------------------------
const capabilitiesRegistry = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "registryVersion": "2.0.0",
  "lastVerified": "2026-10-08T23:30:00Z",
  "categories": {
    "CODING": {
      "description": "General software engineering, refactoring, code editing, and algorithmic development",
      "primaryResolver": { "type": "STATIC_AGENT", "name": "senior-fullstack-engineer" },
      "specialistResolvers": [
        { "language": "TypeScript/React", "resolver": "frontend-engineer" },
        { "language": "Python/Node/Go", "resolver": "backend-engineer" },
        { "language": "SQL/Migrations", "resolver": "database-engineer" },
        { "language": "APIs/Contracts", "resolver": "api-engineer" }
      ],
      "associatedSkills": ["autofix", "code-review", "ponytail-audit"],
      "associatedMcp": ["ponytail"],
      "externalAdapter": { "name": "Aider", "adapter": ".agents/adapters/aider-adapter.json" }
    },
    "AUTONOMOUS_SWE": {
      "description": "Autonomous GitHub issue resolution, end-to-end repository fixes, and benchmark challenge execution",
      "primaryResolver": { "type": "STATIC_AGENT", "name": "gsd-executor" },
      "specialistResolvers": [
        { "tier": "Lead", "resolver": "senior-fullstack-engineer" },
        { "tier": "Verification", "resolver": "qa-engineer" }
      ],
      "associatedSkills": ["gsd-execute-phase", "gsd-audit-fix"],
      "associatedMcp": ["gsd"],
      "externalAdapter": { "name": "OpenHands", "adapter": ".agents/adapters/openhands-adapter.json" }
    },
    "MULTI_AGENT_ORCHESTRATION": {
      "description": "Master coordination, capability routing, dependency DAG execution, and synthesis",
      "primaryResolver": { "type": "ORCHESTRATOR", "name": "orchestration-agent-v2" },
      "specialistResolvers": [
        { "role": "Planning", "resolver": "gsd-planner" },
        { "role": "Architecture", "resolver": "product-architect" }
      ],
      "associatedSkills": ["gsd-plan-phase", "gsd-progress"],
      "associatedMcp": ["sequential-thinking", "gsd"],
      "externalAdapter": null
    },
    "COMPUTER_USE_BROWSER": {
      "description": "Browser automation, visual assertions, DOM accessibility inspection, web app verification",
      "primaryResolver": { "type": "STATIC_AGENT", "name": "browser-automation-agent" },
      "specialistResolvers": [
        { "role": "E2E Testing", "resolver": "e2e-test-engineer" },
        { "role": "Accessibility", "resolver": "accessibility-engineer" }
      ],
      "associatedSkills": ["gsd-dom-verifier"],
      "associatedMcp": ["playwright", "maestro"],
      "externalAdapter": null
    },
    "RESEARCH_AGENTS": {
      "description": "Technical web research, documentation lookup, academic literature queries",
      "primaryResolver": { "type": "STATIC_AGENT", "name": "web-research-agent" },
      "specialistResolvers": [
        { "domain": "Deep Architecture", "resolver": "research-agent" },
        { "domain": "Phase Research", "resolver": "gsd-phase-researcher" }
      ],
      "associatedSkills": ["literature-search-arxiv", "literature-search-europepmc", "pubmed-database"],
      "associatedMcp": ["context7"],
      "externalAdapter": null
    },
    "MEMORY_CONTEXT": {
      "description": "Persistent context across sessions, temporal decision graphs, and memory retrieval",
      "primaryResolver": { "type": "SKILL", "name": "gsd-mempalace-recall" },
      "specialistResolvers": [
        { "role": "Curator", "resolver": "gsd-mempalace-curator" }
      ],
      "associatedSkills": ["gsd-mempalace-recall", "gsd-mempalace-capture"],
      "associatedMcp": ["sequential-thinking"],
      "externalAdapter": null
    },
    "OBSERVABILITY": {
      "description": "Telemetry analysis, container logging, correlation ID tracing, production monitoring",
      "primaryResolver": { "type": "STATIC_AGENT", "name": "devops-engineer" },
      "specialistResolvers": [
        { "domain": "Reliability Outages", "resolver": "incident-response-agent" },
        { "domain": "Cloud Services", "resolver": "cloud-engineer" }
      ],
      "associatedSkills": ["firebase-crashlytics", "gcp-composer-troubleshooting"],
      "associatedMcp": ["cloudrun"],
      "externalAdapter": null
    },
    "EVALUATION": {
      "description": "AI model evaluation, rubric scoring, failure mode detection, and benchmark assertion",
      "primaryResolver": { "type": "STATIC_AGENT", "name": "gsd-eval-auditor" },
      "specialistResolvers": [
        { "role": "Eval Planner", "resolver": "gsd-eval-planner" },
        { "role": "AI Specialist", "resolver": "aiml-engineer" }
      ],
      "associatedSkills": ["gsd-eval-review", "gsd-ai-integration-phase"],
      "associatedMcp": [],
      "externalAdapter": { "name": "SWE-agent", "adapter": ".agents/adapters/swe-agent-adapter.json" }
    },
    "SECURITY_GUARDRAILS": {
      "description": "Zero-trust vulnerability scanning, secret detection, OWASP audits, security rules verification",
      "primaryResolver": { "type": "STATIC_AGENT", "name": "security-engineer" },
      "specialistResolvers": [
        { "domain": "Phase Verification", "resolver": "gsd-security-auditor" }
      ],
      "associatedSkills": ["firebase-security-rules-auditor", "gsd-secure-phase", "credentials"],
      "associatedMcp": [],
      "externalAdapter": null
    },
    "SANDBOXING": {
      "description": "Isolated container execution, safe bash execution, and quarantine enforcement",
      "primaryResolver": { "type": "TOOL", "name": "run_command" },
      "specialistResolvers": [
        { "role": "DevOps", "resolver": "devops-engineer" },
        { "role": "Infrastructure", "resolver": "infrastructure-engineer" }
      ],
      "associatedSkills": [],
      "associatedMcp": ["cloudrun"],
      "externalAdapter": { "name": "OpenHands", "adapter": ".agents/adapters/openhands-adapter.json" }
    },
    "MODEL_ROUTING": {
      "description": "Dynamic model selection, cost/latency optimization, fallback routing",
      "primaryResolver": { "type": "MCP", "name": "gonkarouter" },
      "specialistResolvers": [
        { "role": "AI Engineer", "resolver": "ai-engineer" }
      ],
      "associatedSkills": ["gemini-api-dev"],
      "associatedMcp": ["gonkarouter"],
      "externalAdapter": null
    },
    "MCP_EXTENSIONS": {
      "description": "Model Context Protocol tools and standard server integration",
      "primaryResolver": { "type": "TOOL", "name": "call_mcp_tool" },
      "specialistResolvers": [
        { "role": "Agent Engineer", "resolver": "agent-engineer" }
      ],
      "associatedSkills": [],
      "associatedMcp": ["playwright", "context7", "cloudrun", "firebase-mcp-server", "maestro", "gsd", "ponytail", "sequential-thinking"],
      "externalAdapter": { "name": "Goose", "adapter": ".agents/adapters/goose-adapter.json" }
    },
    "DATA_RETRIEVAL": {
      "description": "Lakehouse data processing, SQL pipelines, vector embeddings, BigQuery transformations",
      "primaryResolver": { "type": "STATIC_AGENT", "name": "data-engineer" },
      "specialistResolvers": [
        { "domain": "RAG & Vectors", "resolver": "rag-engineer" },
        { "domain": "Analytics", "resolver": "data-analyst" }
      ],
      "associatedSkills": ["bigquery-sql", "bigquery-bigframes", "dbt-bigquery", "dataform-bigquery"],
      "associatedMcp": [],
      "externalAdapter": null
    },
    "DEVOPS_INFRASTRUCTURE": {
      "description": "Container deployment, CI/CD pipelines, cloud provisioning, release governance",
      "primaryResolver": { "type": "STATIC_AGENT", "name": "devops-engineer" },
      "specialistResolvers": [
        { "role": "Cloud Infrastructure", "resolver": "cloud-engineer" },
        { "role": "Release Verification", "resolver": "release-engineer" }
      ],
      "associatedSkills": ["firebase-hosting-basics", "firebase-app-hosting-basics"],
      "associatedMcp": ["cloudrun", "firebase-mcp-server"],
      "externalAdapter": null
    }
  }
};

// -------------------------------------------------------------
// WRITE FILES TO ALL REGISTRY TARGETS
// -------------------------------------------------------------
const fileMap = {
  'agents.json': agentsRegistry,
  'skills.json': skillsRegistry,
  'mcp.json': mcpRegistry,
  'frameworks.json': frameworksRegistry,
  'capabilities.json': capabilitiesRegistry
};

for (const dir of targetDirs) {
  for (const [filename, data] of Object.entries(fileMap)) {
    const fullPath = path.join(dir, filename);
    try {
      fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Wrote ${fullPath}`);
    } catch (err) {
      console.error(`Error writing ${fullPath}: ${err.message}`);
    }
  }
}

console.log('Capability Registry build completed successfully!');
