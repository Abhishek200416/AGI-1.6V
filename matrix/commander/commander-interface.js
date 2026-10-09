/**
 * matrix/commander/commander-interface.js
 * MATRIX X1 — Commander Interface & Relationship Model
 * 
 * Manages operational interaction patterns, learned preferences,
 * versioned corrections, and the 10-step autonomous resolution ladder.
 */

const fs = require('fs');
const path = require('path');
const { attentionEngine, ATTENTION_STATES } = require('./attention-engine');
const { storageFabric } = require('../storage/storage-fabric');
const { memoryFabric, MEMORY_TYPES, EPISTEMIC_MODES } = require('../memory/memory-fabric');

class CommanderInterface {
  constructor() {
    this.profile = {
      role: 'COMMANDER',
      authorityScope: 'FULL_AUTHORIZED',
      preferredNotificationChannel: 'TERMINAL',
      preferredDetailLevel: 'CONCISE_EVIDENCE_FIRST',
      communicationPreferences: {
        autoApproveLowRisk: true,
        batchInformational: true,
        requireApprovalForDeploy: true
      },
      preferencesHistory: [],
      correctionsHistory: []
    };
    this.init();
  }

  init() {
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.storageFile = path.join(baseDir, 'commander', 'commander-profile.json');
    const dir = path.dirname(this.storageFile);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
        this.profile = { ...this.profile, ...data };
      }
    } catch (e) {}
  }

  persistToDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storageFile, JSON.stringify(this.profile, null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Record operational correction from commander ("Don't do that again")
   */
  recordCorrection(correctionText, targetContext = 'WORKFLOW') {
    const timestamp = new Date().toISOString();
    const entry = {
      id: `CORR-${Date.now().toString(36)}`,
      timestamp,
      targetContext,
      rule: correctionText,
      active: true
    };

    // Supersede any conflicting prior correction on same targetContext
    for (const prior of this.profile.correctionsHistory) {
      if (prior.targetContext === targetContext && prior.active) {
        prior.active = false;
        prior.supersededAt = timestamp;
      }
    }

    this.profile.correctionsHistory.push(entry);
    this.persistToDisk();

    // Mirror to Memory Fabric
    memoryFabric.storeMemory({
      type: MEMORY_TYPES.COMMANDER,
      epistemicMode: EPISTEMIC_MODES.FACT,
      content: { rule: correctionText, targetContext },
      source: 'COMMANDER_DIRECTIVE',
      confidence: 1.0,
      importance: 1.0,
      retrieval_tags: ['commander-rule', targetContext]
    });

    return entry;
  }

  /**
   * 10-Step Autonomous Resolution Ladder before escalating to Commander:
   * 1. Check memory.
   * 2. Check skills.
   * 3. Check existing agents.
   * 4. Check capabilities.
   * 5. Search tools.
   * 6. Research.
   * 7. Experiment.
   * 8. Try legitimate alternatives.
   * 9. Evaluate results.
   * 10. Only then construct precise Commander Decision Card.
   */
  resolveOrEscalate({
    issueDescription,
    alternativesTested = [],
    autonomousOptions = []
  }) {
    // If an alternative worked, do not escalate!
    const viableAlternative = alternativesTested.find(a => a.success);
    if (viableAlternative) {
      return {
        escalated: false,
        resolvedAutonomously: true,
        selectedAlternative: viableAlternative,
        action: 'PROCEED'
      };
    }

    // Must construct a precise decision card with recommendation
    const attentionCheck = attentionEngine.classifyInterruption({
      topic: issueDescription,
      urgency: 'MEDIUM',
      reversibility: 'HIGH',
      hasAutonomousAlternative: false
    });

    const decisionCard = {
      escalated: true,
      attentionLevel: attentionCheck.action,
      header: 'COMMANDER DECISION REQUIRED',
      issue: issueDescription,
      options: autonomousOptions.length > 0 ? autonomousOptions : [
        { key: 'A', description: 'Proceed with safe default and degrade gracefully' },
        { key: 'B', description: 'Halt mission and wait for manual intervention' }
      ],
      recommendation: autonomousOptions[0]?.key || 'A',
      evidence: alternativesTested.map(a => `${a.name}: ${a.result}`).join('; '),
      format: 'Reply: A or B'
    };

    return decisionCard;
  }

  getProfile() {
    return this.profile;
  }
}

const commanderInterface = new CommanderInterface();

module.exports = { CommanderInterface, commanderInterface };
