/**
 * matrix/skills/skill-fabric.js
 * MATRIX X1 — Skill Fabric
 * 
 * Manages reusable operational procedures and skills.
 * Loads skills dynamically on demand based on task triggers.
 */

const fs = require('fs');
const path = require('path');

class SkillFabric {
  constructor() {
    this.skills = new Map();
    this.initNativeSkills();
  }

  initNativeSkills() {
    this.registerSkill({
      id: 'skill:code-testing',
      name: 'Automated Code Testing',
      triggerKeywords: ['test', 'verify', 'validate', 'assert', 'spec'],
      procedure: 'Run deterministic test runner, verify zero failures, extract assertion metrics.',
      version: '1.0.0'
    });
    this.registerSkill({
      id: 'skill:market-backtesting',
      name: 'Market Indicator & Backtest Engine',
      triggerKeywords: ['backtest', 'market', 'rsi', 'macd', 'trading', 'paper-trade'],
      procedure: 'Parse tick prices, compute moving averages, simulate fill execution with slippage and fees.',
      version: '1.0.0'
    });
    this.registerSkill({
      id: 'skill:storage-reconciliation',
      name: 'Storage Disconnect & Recovery Reconciliation',
      triggerKeywords: ['storage', 'disconnect', 'reconcile', 'volume', 'mount'],
      procedure: 'Halt uncommitted writes, write emergency snapshot to local fallback, poll mount point, restore on reconnection.',
      version: '1.0.0'
    });
  }

  registerSkill(skillObj) {
    this.skills.set(skillObj.id, {
      ...skillObj,
      registeredAt: new Date().toISOString()
    });
  }

  findMatchingSkills(taskDescription) {
    const desc = taskDescription.toLowerCase();
    const matched = [];
    for (const s of this.skills.values()) {
      if (s.triggerKeywords.some(k => desc.includes(k))) {
        matched.push(s);
      }
    }
    return matched;
  }

  getAllSkills() {
    return Array.from(this.skills.values());
  }
}

const skillFabric = new SkillFabric();

module.exports = { SkillFabric, skillFabric };
