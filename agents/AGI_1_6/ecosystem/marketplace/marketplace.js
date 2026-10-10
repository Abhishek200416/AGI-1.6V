/**
 * .agents/marketplace/marketplace.js
 * Universal Capability Marketplace Subsystem (V3)
 * Manages lifecycle states:
 * INSTALL | ADAPT | ENABLE | DISABLE | QUARANTINE | REMOVE
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_DIR = path.resolve(__dirname, '../registry');

const MARKETPLACE_CATEGORIES = [
  "Agents",
  "Skills",
  "MCP",
  "Frameworks",
  "Plugins",
  "Evaluators",
  "Memory",
  "Research",
  "Browser",
  "Computer Use",
  "Security",
  "DevOps",
  "Data",
  "AI/ML"
];

const ALLOWED_ACTIONS = ["INSTALL", "ADAPT", "ENABLE", "DISABLE", "QUARANTINE", "REMOVE"];

function getRegistryPath(filename) {
  return path.join(REGISTRY_DIR, filename);
}

function loadRegistry(filename) {
  const p = getRegistryPath(filename);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  return {};
}

function saveRegistry(filename, data) {
  const p = getRegistryPath(filename);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Transition a capability state in the marketplace
 */
function transitionCapability(category, name, action, metadata = {}) {
  if (!ALLOWED_ACTIONS.includes(action)) {
    throw new Error(`Invalid marketplace action: ${action}. Allowed: ${ALLOWED_ACTIONS.join(', ')}`);
  }

  console.log(`[MARKETPLACE] ${action} on ${category}:${name}`);

  let targetFile = 'external-agents.json';
  if (category.toLowerCase() === 'skills') targetFile = 'external-skills.json';
  else if (category.toLowerCase() === 'mcp') targetFile = 'mcp.json';

  const reg = loadRegistry(targetFile);

  // Apply state transitions
  if (action === 'DISABLE') {
    // Flag as disabled
    const health = loadRegistry('health.json');
    if (!health.disabledCapabilities) health.disabledCapabilities = [];
    health.disabledCapabilities.push({ name, category, timestamp: new Date().toISOString() });
    saveRegistry('health.json', health);
  } else if (action === 'QUARANTINE') {
    const sec = loadRegistry('security.json');
    if (!sec.quarantinedCapabilities) sec.quarantinedCapabilities = [];
    sec.quarantinedCapabilities.push({ name, reason: metadata.reason || 'Security threat detected', timestamp: new Date().toISOString() });
    saveRegistry('security.json', sec);
  }

  return {
    success: true,
    action,
    category,
    name,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  MARKETPLACE_CATEGORIES,
  ALLOWED_ACTIONS,
  transitionCapability
};
