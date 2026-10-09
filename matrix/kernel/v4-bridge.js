/**
 * matrix/kernel/v4-bridge.js
 * MATRIX X1 — V4 Orchestrator Integration Bridge
 * 
 * Preserves complete backward compatibility with V4's 27-step execution pipeline,
 * while allowing Matrix X1 to operate as the persistent master runtime.
 */

const { orchestratorV4 } = require('../../.agents/v4/orchestrator-v4');

class V4Bridge {
  constructor() {
    this.v4 = orchestratorV4;
  }

  async executeTaskViaV4(taskOptions) {
    return await this.v4.executeTask(taskOptions);
  }

  async answerOperatingQuestions(taskId) {
    return await this.v4.answerOperatingQuestions(taskId);
  }
}

const v4Bridge = new V4Bridge();

module.exports = { V4Bridge, v4Bridge };
