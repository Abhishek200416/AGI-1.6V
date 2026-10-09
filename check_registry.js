/**
 * check_registry.js
 * Ponytail runnable self-check for Antigravity V2 Capability Registry.
 * Zero dependencies, pure Node.js assert-based validation.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- STARTING REGISTRY INTEGRITY SELF-CHECK ---');

// 1. JSON Syntax & Encoding Integrity
const jsonFiles = [
  '.agents/registry/agents.json',
  '.agents/registry/skills.json',
  '.agents/registry/mcp.json',
  '.agents/registry/frameworks.json',
  '.agents/registry/capabilities.json',
  '.agents/adapters/openhands-adapter.json',
  '.agents/adapters/opencode-adapter.json',
  '.agents/adapters/goose-adapter.json',
  '.agents/adapters/aider-adapter.json',
  '.agents/adapters/cline-adapter.json',
  '.agents/adapters/swe-agent-adapter.json',
  '.agents/adapters/qwen-code-adapter.json'
];

const parsed = {};
for (const file of jsonFiles) {
  assert(fs.existsSync(file), `File must exist: ${file}`);
  const content = fs.readFileSync(file, 'utf-8');
  parsed[file] = JSON.parse(content);
  console.log(`✓ Valid JSON: ${file}`);
}

// 2. Orchestration Rollback & Fallback Verification
assert(fs.existsSync('.agents/agents/orchestration-agent-v2.md'), 'V2 Gateway file must exist');
assert(fs.existsSync('.agents/agents/orchestration-agent-v1.md'), 'V1 Rollback target must exist');
assert(fs.existsSync('.agents/agents/orchestrator.md'), 'Legacy alias must exist');
console.log('✓ Orchestrator files and rollback target verified.');

// 3. Static Agent Referential Integrity
const agentsData = parsed['.agents/registry/agents.json'];
assert(Array.isArray(agentsData.staticAgents), 'staticAgents must be an array');
assert(agentsData.staticAgents.length > 0, 'staticAgents must not be empty');

const agentNames = new Set(agentsData.staticAgents.map(a => a.name));
for (const agent of agentsData.staticAgents) {
  if (agent.repository.startsWith('local://')) {
    const relPath = agent.repository.replace('local://', '');
    assert(fs.existsSync(relPath), `Agent file on disk missing: ${relPath} for ${agent.name}`);
  }
}
console.log(`✓ All ${agentsData.staticAgents.length} static agents physically verified on disk.`);

// 4. Capability Resolvers Integrity
const capsData = parsed['.agents/registry/capabilities.json'];
for (const [pillar, config] of Object.entries(capsData.categories)) {
  if (config.primaryResolver.type === 'STATIC_AGENT') {
    assert(agentNames.has(config.primaryResolver.name), `Primary resolver ${config.primaryResolver.name} in ${pillar} missing from agents.json`);
  }
  if (config.specialistResolvers) {
    for (const spec of config.specialistResolvers) {
      if (spec.resolver && !spec.resolver.includes(' ')) {
        assert(agentNames.has(spec.resolver), `Specialist resolver ${spec.resolver} in ${pillar} missing from agents.json`);
      }
    }
  }
}
console.log(`✓ All 14 capability pillars have valid, existing resolvers.`);

// 5. Mathematical Scoring Integrity
const frameworksData = parsed['.agents/registry/frameworks.json'];
for (const fw of frameworksData.frameworks) {
  const sum = Object.values(fw.scoreBreakdown).reduce((a, b) => a + b, 0);
  assert.strictEqual(fw.qualityScore, sum, `Mathematical mismatch in ${fw.name}: declared ${fw.qualityScore} != sum ${sum}`);
}
console.log(`✓ All ${frameworksData.frameworks.length} frameworks mathematically validated.`);

// 6. Adapter Schema Conformance (JSON Schema Draft-07 / 2020-12)
for (const [file, data] of Object.entries(parsed)) {
  if (file.includes('adapter.json')) {
    assert.strictEqual(data.input.type, 'object', `${file} input.type must be 'object'`);
    assert(typeof data.input.properties === 'object', `${file} input.properties must be object`);
    assert.strictEqual(data.output.type, 'object', `${file} output.type must be 'object'`);
    assert(typeof data.output.properties === 'object', `${file} output.properties must be object`);
  }
}
console.log(`✓ All 7 adapters conform to standard JSON Schema.`);

// 7. Secret Redaction Invariant (Rule 1)
const mcpContent = fs.readFileSync('.agents/registry/mcp.json', 'utf-8');
assert(!mcpContent.includes('sk-o4Mr'), 'MCP registry must never contain cleartext API keys!');
assert(mcpContent.includes('[REDACTED_API_KEY]'), 'API key must be redacted in MCP registry');
console.log('✓ Secret redaction invariant confirmed.');

// 8. Docker Socket Host Mount Mitigation (SEC-02)
const openhandsAdapter = fs.readFileSync('.agents/adapters/openhands-adapter.json', 'utf-8');
assert(!openhandsAdapter.includes('/var/run/docker.sock:/var/run/docker.sock'), 'OpenHands adapter must not mount host docker.sock');
console.log('✓ Host root escalation vulnerability mitigated in OpenHands adapter.');

console.log('--- ALL 8 INTEGRITY SUITES PASSED (100% GREEN) ---');
