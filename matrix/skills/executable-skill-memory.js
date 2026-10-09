/**
 * matrix/skills/executable-skill-memory.js
 * MATRIX X1 — Executable Skill Memory (Voyager-style Lifelong Skill Acquisition)
 * 
 * Automatically captures successful, verified procedural solutions
 * and synthesizes them into executable skills stored in the library.
 * Backs `matrix x1 learn`.
 */

const fs = require('fs');
const path = require('path');
const { storageFabric } = require('../storage/storage-fabric');
const { skillFabric } = require('./skill-fabric');
const { memoryFabric, MEMORY_TYPES, EPISTEMIC_MODES } = require('../memory/memory-fabric');

class ExecutableSkillMemory {
  constructor() {
    this.executableSkills = new Map();
    this.init();
  }

  init() {
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.storageFile = path.join(baseDir, 'skills', 'matrix-executable-skills.json');
    const dir = path.dirname(this.storageFile);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const items = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
        for (const it of items) this.executableSkills.set(it.id, it);
      }
    } catch (e) {}
  }

  persistToDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storageFile, JSON.stringify(Array.from(this.executableSkills.values()), null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Distill and crystallize a successful mission workflow into an executable skill
   */
  crystallizeSkill({
    problemClass,
    skillName,
    triggerKeywords = [],
    procedureCode,
    inputs,
    verificationProof,
    successHistory = 1
  }) {
    const id = `SKL-EXEC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const skillRecord = {
      id,
      problemClass,
      skillName,
      triggerKeywords,
      inputs,
      procedureCode,
      verificationProof,
      successCount: successHistory,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    this.executableSkills.set(id, skillRecord);
    this.persistToDisk();

    // Register into Skill Fabric
    skillFabric.registerSkill({
      id,
      name: skillName,
      triggerKeywords,
      procedure: procedureCode,
      version: '1.0.0'
    });

    // Mirror to Memory Fabric
    memoryFabric.storeMemory({
      type: MEMORY_TYPES.PROCEDURAL,
      epistemicMode: EPISTEMIC_MODES.FACT,
      content: { skillId: id, skillName, problemClass },
      source: 'SKILL_CRYSTALLIZATION',
      confidence: 1.0,
      importance: 0.9,
      retrieval_tags: ['executable-skill', problemClass, ...triggerKeywords]
    });

    return skillRecord;
  }

  getAllSkills() {
    return Array.from(this.executableSkills.values());
  }
}

const executableSkillMemory = new ExecutableSkillMemory();

module.exports = { ExecutableSkillMemory, executableSkillMemory };
