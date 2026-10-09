/**
 * agi/skills/skill-registry.js
 * AGI 0.7 — Skill Registry & Lifecycle Manager
 * 
 * Enforces the formal skill lifecycle: DRAFT -> CANDIDATE -> VALIDATED -> ACTIVE -> DEPRECATED
 */

const fs = require('fs');
const path = require('path');

const LIFECYCLE_STATES = ['DRAFT', 'CANDIDATE', 'VALIDATED', 'ACTIVE', 'DEPRECATED'];

class SkillRegistry {
  constructor(storagePath = null) {
    this.storagePath = storagePath || path.resolve(process.cwd(), 'agi/data/skills.json');
    this.skills = {};
    this._ensureStorage();
    this.load();
  }

  _ensureStorage() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  load() {
    if (fs.existsSync(this.storagePath)) {
      try {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        this.skills = JSON.parse(raw);
      } catch {
        this.skills = {};
      }
    }
  }

  persist() {
    const tmp = `${this.storagePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.skills, null, 2), 'utf8');
    fs.renameSync(tmp, this.storagePath);
  }

  registerSkill({ id, name, description, parameters = {}, implementation, version = '1.0.0' }) {
    if (!id || !name || !implementation) {
      throw new Error('Skill requires id, name, and implementation');
    }

    const skill = {
      id,
      name,
      description: description || '',
      version,
      parameters,
      implementation, // JavaScript function string or execution descriptor
      status: 'DRAFT',
      tests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.skills[id] = skill;
    this.persist();
    return skill;
  }

  transitionStatus(skillId, nextStatus, proof = {}) {
    const skill = this.skills[skillId];
    if (!skill) throw new Error(`Skill ${skillId} not found`);

    const validTransitions = {
      DRAFT: ['CANDIDATE'],
      CANDIDATE: ['VALIDATED', 'DRAFT'],
      VALIDATED: ['ACTIVE', 'CANDIDATE'],
      ACTIVE: ['DEPRECATED'],
      DEPRECATED: []
    };

    const allowed = validTransitions[skill.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid skill transition from ${skill.status} to ${nextStatus}`);
    }

    skill.status = nextStatus;
    skill.lastProof = proof;
    skill.updatedAt = new Date().toISOString();
    this.persist();
    return skill;
  }

  addTest(skillId, testCase) {
    const skill = this.skills[skillId];
    if (!skill) throw new Error(`Skill ${skillId} not found`);
    skill.tests.push(testCase);
    this.persist();
    return skill.tests.length;
  }

  validateSkill(skillId, testRunnerFn) {
    const skill = this.skills[skillId];
    if (!skill) throw new Error(`Skill ${skillId} not found`);

    if (skill.tests.length === 0) {
      throw new Error(`Skill ${skillId} has no tests defined`);
    }

    let passed = 0;
    for (const test of skill.tests) {
      const result = testRunnerFn(skill, test);
      if (result === true || (result && result.pass)) {
        passed++;
      }
    }

    if (passed === skill.tests.length) {
      return this.transitionStatus(skillId, 'VALIDATED', { passedTests: passed, totalTests: skill.tests.length });
    }
    throw new Error(`Validation failed: ${passed}/${skill.tests.length} tests passed`);
  }

  promoteToActive(skillId) {
    const skill = this.skills[skillId];
    if (!skill) throw new Error(`Skill ${skillId} not found`);
    if (skill.status !== 'VALIDATED') {
      throw new Error(`Skill ${skillId} must be VALIDATED before becoming ACTIVE`);
    }
    return this.transitionStatus(skillId, 'ACTIVE');
  }

  getActiveSkills() {
    return Object.values(this.skills).filter(s => s.status === 'ACTIVE');
  }

  getSkill(skillId) {
    return this.skills[skillId] || null;
  }
}

module.exports = { SkillRegistry, LIFECYCLE_STATES };
