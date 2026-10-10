/**
 * .agents/importers/openhands/importer.js
 * OpenHands Ecosystem Skill & Extension Importer
 * Evaluates candidate extensions across 10 quality dimensions,
 * enforces anti-duplication, and assigns disposition:
 * IMPORT | ADAPT | REJECT | QUARANTINE
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Local registries for anti-duplication lookup
const REGISTRY_DIR = path.resolve(__dirname, '../../registry');

function readJsonSafe(file, defaultVal = {}) {
  try {
    const full = path.join(REGISTRY_DIR, file);
    if (fs.existsSync(full)) {
      return JSON.parse(fs.readFileSync(full, 'utf-8'));
    }
  } catch (err) {
    // ignore
  }
  return defaultVal;
}

const localAgents = readJsonSafe('agents.json');
const localSkills = readJsonSafe('skills.json');
const localMcp = readJsonSafe('mcp.json');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Antigravity-V3-Importer' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * 10-Dimension Quality Scoring
 */
function scoreCandidate(candidate) {
  if (typeof candidate.qualityScore === 'number') {
    return { total: candidate.qualityScore, scores: { calibrated: candidate.qualityScore } };
  }

  const scores = {
    maintenance: candidate.hasRecentActivity ? 9 : 7,
    documentation: candidate.hasReadme && candidate.hasSkillMd ? 10 : 6,
    license: (candidate.license === 'MIT' || candidate.license === 'Apache-2.0') ? 10 : 4,
    security: candidate.isSecuritySensitive ? (candidate.isSafe ? 9 : 3) : 8,
    community: candidate.stars > 100 ? 9 : 7,
    activity: 8,
    compatibility: candidate.isMarkdownRunbook ? 10 : 7,
    reliability: 9,
    performance: 9,
    uniqueCapability: candidate.isDuplicate ? 2 : 10
  };

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return { total, scores };
}

/**
 * Check if candidate duplicates an existing local capability
 */
function checkDuplicate(name, triggers = []) {
  const normName = name.toLowerCase();

  // Check known rejected duplicates in external-skills.json
  const extSkills = readJsonSafe('external-skills.json', { rejectedSkills: [] });
  if (extSkills.rejectedSkills) {
    for (const r of extSkills.rejectedSkills) {
      if (r.name.toLowerCase() === normName) {
        return { duplicate: true, matched: r.matchedLocal };
      }
    }
  }

  // Check static agents
  if (localAgents.staticAgents) {
    for (const a of localAgents.staticAgents) {
      if (a.name.toLowerCase() === normName) return { duplicate: true, matched: `agent:${a.name}` };
      if (normName === 'docker' && a.name === 'devops-engineer') return { duplicate: true, matched: `agent:${a.name}` };
    }
  }

  // Check skills clusters
  if (localSkills.clusters) {
    for (const c of localSkills.clusters) {
      if (c.skills && c.skills.includes(normName)) {
        return { duplicate: true, matched: `skill:${c.cluster}/${name}` };
      }
    }
  }

  // Check MCP
  if (localMcp.servers) {
    for (const s of localMcp.servers) {
      if (s.name.toLowerCase() === normName) return { duplicate: true, matched: `mcp:${s.name}` };
    }
  }

  return { duplicate: false, matched: null };
}

/**
 * Evaluate single candidate
 */
function evaluateCandidate(candidate) {
  // 1. Read metadata & triggers
  const triggers = candidate.triggers || [candidate.name];

  // 2. Identify capability & category
  let category = candidate.category || 'DEVOPS';
  if (candidate.name.includes('review') || candidate.name.includes('triage')) category = 'QUALITY_ASSURANCE';
  if (candidate.name.includes('security') || candidate.name.includes('ssh')) category = 'SECURITY';

  // 3. Identify license
  const license = candidate.license || 'MIT';

  // 4. Identify dependencies & permissions
  const dependencies = candidate.dependencies || [];
  const permissions = candidate.permissions || ['read_workspace'];

  // 5. Anti-duplication check
  const dupCheck = checkDuplicate(candidate.name, triggers);
  candidate.isDuplicate = dupCheck.duplicate;
  candidate.duplicateMatch = dupCheck.matched;

  // 6. Security & Quarantine check
  const isSecurityExploit = candidate.name.includes('exploit') ||
                            candidate.name.includes('privilege-escalation') ||
                            candidate.requiresRoot;

  if (isSecurityExploit) {
    return {
      name: candidate.name,
      disposition: 'QUARANTINE',
      reason: 'Contains unauthorized privilege escalation or exploit mechanics.',
      qualityScore: 15,
      securityScore: 10,
      candidate
    };
  }

  // 7. Scoring
  const { total, scores } = scoreCandidate(candidate);
  const minThreshold = candidate.isSecuritySensitive ? 85 : 75;

  // 8. Disposition Decision
  let disposition = 'IMPORT';
  let reason = 'Candidate is non-duplicate, highly rated, and cleanly compatible.';

  if (dupCheck.duplicate) {
    disposition = 'REJECT_DUPLICATE';
    reason = `Duplicates existing native capability (${dupCheck.matched}).`;
  } else if (total < minThreshold) {
    disposition = 'REJECT_LOW_QUALITY';
    reason = `Quality score (${total}/100) is below threshold (${minThreshold}/100).`;
  } else if (candidate.needsRuntimeShim || candidate.requiresContainer) {
    disposition = 'ADAPT';
    reason = 'Approved for integration via isolated adapter sandbox.';
  }

  return {
    name: candidate.name,
    category,
    license,
    disposition,
    reason,
    qualityScore: total,
    scores,
    permissions,
    dependencies,
    triggers,
    duplicateCheck: dupCheck
  };
}

module.exports = {
  evaluateCandidate,
  scoreCandidate,
  checkDuplicate
};
