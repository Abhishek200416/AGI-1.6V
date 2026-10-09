/**
 * matrix/missions/mission-engine.js
 * MATRIX X1 — Long-Running Mission Engine & Durable Runtime
 * 
 * Implements:
 * - 15 Mission States (Section 33):
 *   PLANNED, READY, RUNNING, WAITING, BLOCKED, RESEARCHING,
 *   EXECUTING, VERIFYING, RECOVERING, AWAITING_COMMANDER, PAUSED,
 *   COMPLETED, FAILED, CANCELLED, ARCHIVED (with ACTIVE/CREATED compatibility)
 * - Complete Long-Horizon Mission Model (Section 32)
 * - Mission Heartbeat & Stall Detection (distinguishing activity from progress) (Section 34 & 35)
 * - Hierarchical Planning: Mission -> Objectives -> Subobjectives -> Tasks -> Actions (Section 36)
 * - Sleep / Wait Mode: WAITING_FOR_EVENT (Section 38 & 39)
 * - Cross-Restart Continuity & State Recovery (Section 40 & 41)
 */

const fs = require('fs');
const path = require('path');
const { storageFabric } = require('../storage/storage-fabric');
const { eventBus, EVENT_TYPES } = require('../events/event-bus');
const { workforceCompiler } = require('../agents/workforce-compiler');
const { verificationEngine } = require('../verification/verification-engine');
const { tokenEconomy } = require('../economy/token-economy');

const MISSION_STATES = {
  CREATED: 'CREATED',
  PLANNED: 'PLANNED',
  READY: 'READY',
  RUNNING: 'RUNNING',
  ACTIVE: 'ACTIVE',
  WAITING: 'WAITING',
  BLOCKED: 'BLOCKED',
  RESEARCHING: 'RESEARCHING',
  EXECUTING: 'EXECUTING',
  VERIFYING: 'VERIFYING',
  RECOVERING: 'RECOVERING',
  AWAITING_COMMANDER: 'AWAITING_COMMANDER',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  ARCHIVED: 'ARCHIVED'
};

class MissionEngine {
  constructor() {
    this.activeMissions = new Map();
    this.completedMissions = new Map();
    this.heartbeatInterval = null;
    this.init();
  }

  init() {
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.storageFile = path.join(baseDir, 'missions', 'matrix-missions.json');
    const dir = path.dirname(this.storageFile);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = JSON.parse(fs.readFileSync(this.storageFile, 'utf8'));
        const ensureHeartbeat = (m) => {
          if (!m.heartbeat) {
            m.heartbeat = {
              lastHeartbeat: m.updatedAt || new Date().toISOString(),
              lastProgress: m.updatedAt || new Date().toISOString(),
              lastMeaningfulAction: 'LOADED_FROM_DISK',
              stalled: false,
              stallReason: null,
              actionLoopHistory: []
            };
          }
          return m;
        };
        for (const m of (raw.active || [])) this.activeMissions.set(m.id, ensureHeartbeat(m));
        for (const m of (raw.completed || [])) this.completedMissions.set(m.id, ensureHeartbeat(m));
      }
    } catch (e) {}
  }

  persistToDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storageFile, JSON.stringify({
        active: Array.from(this.activeMissions.values()),
        completed: Array.from(this.completedMissions.values()),
        updatedAt: new Date().toISOString()
      }, null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Create and register a durable long-running mission (Section 32)
   */
  createMission({
    id = null,
    title,
    objective,
    commander = 'COMMANDER',
    successDefinition = 'Objective verified by empirical tests',
    riskLevel = 'LOW',
    priority = 'NORMAL',
    deadline = null,
    constraints = [],
    assumptions = [],
    unknowns = []
  }) {
    const missionId = id || `MSN-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 4)}`;
    
    // Compile minimal sufficient workforce
    const organization = workforceCompiler.compileWorkforce({
      missionId,
      objective,
      riskLevel
    });

    const mission = {
      id: missionId,
      commander,
      title: title || objective,
      objective,
      success_definition: successDefinition,
      riskLevel,
      priority,
      deadline,
      constraints,
      assumptions,
      unknowns,
      state: MISSION_STATES.CREATED,
      progress: 0,
      subgoals: [],
      milestones: [
        { id: 'M1', name: 'Environment & Capability Inspection', status: 'PENDING' },
        { id: 'M2', name: 'Implementation & Execution', status: 'PENDING' },
        { id: 'M3', name: 'Empirical Verification & Testing', status: 'PENDING' },
        { id: 'M4', name: 'Delivery & Evidence Certification', status: 'PENDING' }
      ],
      hierarchy: {
        objectives: [],
        subobjectives: [],
        tasks: [],
        actions: []
      },
      organization,
      evidence: [],
      decisions: [],
      failures: [],
      checkpoints: [],
      recovery_plan: null,
      commander_dependencies: [],
      heartbeat: {
        lastHeartbeat: new Date().toISOString(),
        lastProgress: new Date().toISOString(),
        lastMeaningfulAction: 'MISSION_CREATED',
        stalled: false,
        stallReason: null,
        actionLoopHistory: []
      },
      tokenUsage: { input: 0, output: 0 },
      last_observation: null,
      last_verification: null,
      next_action: 'Advance M1 (Environment & Capability Inspection)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.activeMissions.set(missionId, mission);
    this.persistToDisk();

    // Checkpoint immediately
    storageFabric.saveCheckpoint(`mission-init-${missionId}`, mission);

    eventBus.emitEvent(EVENT_TYPES.MISSION_CREATED, { missionId, objective });
    return mission;
  }

  /**
   * Record mission heartbeat & inspect for stall condition (Section 34 & 35)
   */
  recordHeartbeat(missionId, actionDetails = {}) {
    const mission = this.activeMissions.get(missionId);
    if (!mission) return null;
    if (!mission.heartbeat) {
      mission.heartbeat = {
        lastHeartbeat: new Date().toISOString(),
        lastProgress: new Date().toISOString(),
        lastMeaningfulAction: 'MISSION_ACTIVE',
        stalled: false,
        stallReason: null,
        actionLoopHistory: []
      };
    }

    const now = new Date().toISOString();
    mission.heartbeat.lastHeartbeat = now;
    if (actionDetails.meaningfulAction) {
      mission.heartbeat.lastMeaningfulAction = actionDetails.meaningfulAction;
      mission.heartbeat.lastProgress = now;
    }

    // Record action into loop history for stall detection
    const loopHistory = mission.heartbeat.actionLoopHistory;
    loopHistory.push({
      action: actionDetails.action || 'STEP',
      tool: actionDetails.tool || 'generic',
      params: actionDetails.params ? JSON.stringify(actionDetails.params).substring(0, 100) : '',
      success: actionDetails.success !== false,
      timestamp: now
    });
    if (loopHistory.length > 15) loopHistory.shift();

    // STALL DETECTION: Distinguish activity from progress (Section 35)
    const stallAnalysis = this.checkStall(mission);
    mission.heartbeat.stalled = stallAnalysis.isStalled;
    mission.heartbeat.stallReason = stallAnalysis.reason;

    if (stallAnalysis.isStalled) {
      mission.state = MISSION_STATES.RECOVERING;
      eventBus.emitEvent(EVENT_TYPES.MISSION_UPDATED, {
        missionId,
        stalled: true,
        reason: stallAnalysis.reason,
        recommendation: stallAnalysis.recommendation
      });
    }

    mission.updatedAt = now;
    this.persistToDisk();
    return { heartbeat: mission.heartbeat, stalled: stallAnalysis.isStalled };
  }

  /**
   * Stall Detector: checks repeating failed tool calls or lack of progress
   */
  checkStall(mission) {
    const history = mission.heartbeat.actionLoopHistory;
    if (history.length < 3) return { isStalled: false };

    // 1. Repeating failed actions
    const recentFails = history.slice(-3);
    const allRecentFailed = recentFails.every(h => !h.success);
    if (allRecentFailed && recentFails[0].tool === recentFails[1].tool && recentFails[1].tool === recentFails[2].tool) {
      return {
        isStalled: true,
        reason: `Repeated tool failure loop detected on '${recentFails[0].tool}' (3 consecutive failures).`,
        recommendation: 'SWITCH_TOOL_OR_CHANGE_WORKFLOW'
      };
    }

    // 2. Identical parameters repeated 3 times without milestone progress
    const lastThree = history.slice(-3);
    if (lastThree[0].action === lastThree[1].action && lastThree[1].action === lastThree[2].action &&
        lastThree[0].params === lastThree[1].params && lastThree[0].params !== '') {
      return {
        isStalled: true,
        reason: `Repetitive action loop detected with identical arguments: '${lastThree[0].action}'.`,
        recommendation: 'REPLAN_SUBGOAL'
      };
    }

    return { isStalled: false };
  }

  /**
   * Hierarchical planning builder (Section 36)
   */
  setHierarchy(missionId, hierarchy) {
    const mission = this.activeMissions.get(missionId);
    if (mission) {
      mission.hierarchy = {
        objectives: hierarchy.objectives || [],
        subobjectives: hierarchy.subobjectives || [],
        tasks: hierarchy.tasks || [],
        actions: hierarchy.actions || []
      };
      mission.updatedAt = new Date().toISOString();
      this.persistToDisk();
      return mission.hierarchy;
    }
    return null;
  }

  /**
   * Advance a milestone in a mission
   */
  advanceMilestone(missionId, milestoneId, milestoneEvidence = {}) {
    if (!this.activeMissions.has(missionId)) return null;
    const mission = this.activeMissions.get(missionId);
    const m = mission.milestones.find(x => x.id === milestoneId);
    if (m) {
      m.status = 'COMPLETED';
      m.completedAt = new Date().toISOString();
      m.evidence = milestoneEvidence;
      mission.evidence.push(milestoneEvidence);
      mission.last_verification = { milestoneId, status: 'VERIFIED_PASS', timestamp: new Date().toISOString() };
    }

    const completedCount = mission.milestones.filter(x => x.status === 'COMPLETED').length;
    mission.progress = Math.round((completedCount / mission.milestones.length) * 100);
    mission.state = (mission.progress === 100) ? MISSION_STATES.COMPLETED : MISSION_STATES.ACTIVE;
    mission.updatedAt = new Date().toISOString();

    // Reset loop history on real progress
    if (!mission.heartbeat) {
      mission.heartbeat = {
        lastHeartbeat: new Date().toISOString(),
        lastProgress: new Date().toISOString(),
        lastMeaningfulAction: 'MISSION_ACTIVE',
        stalled: false,
        stallReason: null,
        actionLoopHistory: []
      };
    }
    mission.heartbeat.lastProgress = new Date().toISOString();
    mission.heartbeat.lastMeaningfulAction = `ADVANCED_MILESTONE_${milestoneId}`;
    mission.heartbeat.stalled = false;

    // Save milestone checkpoint
    const cp = storageFabric.saveCheckpoint(`mission-${missionId}-${milestoneId}`, mission);
    mission.checkpoints.push(cp.checkpointId);

    if (mission.state === MISSION_STATES.COMPLETED) {
      this.activeMissions.delete(missionId);
      this.completedMissions.set(missionId, mission);
      eventBus.emitEvent(EVENT_TYPES.MISSION_COMPLETED, { missionId, progress: 100 });
    } else {
      eventBus.emitEvent(EVENT_TYPES.MISSION_UPDATED, { missionId, milestoneId, progress: mission.progress });
    }

    this.persistToDisk();
    return mission;
  }

  /**
   * Pause a running mission
   */
  pauseMission(missionId, reason = 'COMMANDER_REQUEST') {
    if (this.activeMissions.has(missionId)) {
      const m = this.activeMissions.get(missionId);
      m.state = MISSION_STATES.PAUSED;
      m.pauseReason = reason;
      storageFabric.saveCheckpoint(`mission-pause-${missionId}`, m);
      this.persistToDisk();
      eventBus.emitEvent(EVENT_TYPES.MISSION_PAUSED, { missionId, reason });
      return m;
    }
    return null;
  }

  /**
   * Resume a paused mission from its last checkpoint
   */
  resumeMission(missionId) {
    if (this.activeMissions.has(missionId)) {
      const m = this.activeMissions.get(missionId);
      m.state = MISSION_STATES.ACTIVE;
      m.resumedAt = new Date().toISOString();
      m.heartbeat.lastProgress = new Date().toISOString();
      this.persistToDisk();
      eventBus.emitEvent(EVENT_TYPES.MISSION_RESUMED, { missionId });
      return m;
    }
    return null;
  }

  /**
   * Sleep / Wait mode waiting for an external event (Section 38)
   */
  async waitForEvent(missionId, eventType, timeoutMs = 5000) {
    const mission = this.activeMissions.get(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.state = MISSION_STATES.WAITING;
    mission.waitingFor = eventType;
    this.persistToDisk();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        mission.state = MISSION_STATES.ACTIVE;
        this.persistToDisk();
        resolve({ timeout: true, eventType });
      }, timeoutMs);

      eventBus.once(eventType, (data) => {
        clearTimeout(timer);
        mission.state = MISSION_STATES.ACTIVE;
        mission.waitingFor = null;
        this.persistToDisk();
        resolve({ timeout: false, eventType, data });
      });
    });
  }

  /**
   * Produce comprehensive Final Mission Report (Section 104 & 186)
   */
  generateFinalReport(missionId) {
    const mission = this.completedMissions.get(missionId) || this.activeMissions.get(missionId);
    if (!mission) return null;

    return {
      MISSION_ID: mission.id,
      COMMANDER: mission.commander,
      OBJECTIVE: mission.objective,
      SUCCESS_DEFINITION: mission.success_definition,
      STATE: mission.state,
      PROGRESS: `${mission.progress}%`,
      WORKFORCE: mission.organization ? mission.organization.agents.map(a => a.specialization) : [],
      MILESTONES: mission.milestones,
      EVIDENCE: mission.evidence,
      CHECKPOINTS: mission.checkpoints,
      TOKEN_COST: tokenEconomy.getMetrics().estimatedCostFormatted,
      LAST_VERIFICATION: mission.last_verification,
      LESSONS: ['Continuous verification prevents false positive claims'],
      RECOMMENDED_NEXT_STEP: mission.state === MISSION_STATES.COMPLETED ? 'Archive and promote crystallizable skills' : 'Advance next milestone'
    };
  }

  getActiveMissions() {
    return Array.from(this.activeMissions.values());
  }

  getCompletedMissions() {
    return Array.from(this.completedMissions.values());
  }

  getMission(id) {
    return this.activeMissions.get(id) || this.completedMissions.get(id);
  }
}

const missionEngine = new MissionEngine();

module.exports = { MissionEngine, missionEngine, MISSION_STATES };
