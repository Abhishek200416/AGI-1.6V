/**
 * matrix/evaluation/report-generator.js
 * MATRIX X1.1 — Automated Benchmark & Evaluation Report Generator
 * 
 * Compiles empirical evaluation runs into comprehensive Markdown reports:
 * - Reality classification tables
 * - 95% Wilson confidence intervals & Bayesian posteriors
 * - External benchmark scoreboards
 * - Generalization transfer metrics
 * - Long-horizon degradation curves
 */

class ReportGenerator {
  /**
   * Format reality classification status table
   */
  generateRealityTable(subsystems = []) {
    let md = `| Subsystem / Capability | Classification | Verification Path | Evidence Type | Latency (ms) |\n`;
    md += `|:---|:---:|:---|:---|:---:|\n`;

    for (const sub of subsystems) {
      md += `| **${sub.name}** | \`${sub.classification}\` | ${sub.path || 'Automated Test'} | ${sub.evidenceType || 'Execution Output'} | ${sub.latencyMs || 0} |\n`;
    }

    return md;
  }

  /**
   * Format agent scoreboard table
   */
  generateAgentScoreboard(agents = []) {
    let md = `| Specialist / Agent | Model | Tasks | Pass Rate | 95% Wilson CI | Avg Latency | Cost (USD) |\n`;
    md += `|:---|:---|:---:|:---:|:---:|:---:|:---:|\n`;

    for (const a of agents) {
      const ci = a.confidenceInterval95 ? `[${(a.confidenceInterval95.lower * 100).toFixed(1)}%, ${(a.confidenceInterval95.upper * 100).toFixed(1)}%]` : 'N/A';
      md += `| **${a.specialization || a.agentId}** | \`${a.model}\` | ${a.totalTasks} | **${(a.passRate * 100).toFixed(1)}%** | ${ci} | ${a.avgLatencyMs}ms | \$${(a.totalCostUsd || 0).toFixed(4)} |\n`;
    }

    return md;
  }

  /**
   * Format external benchmark results table
   */
  generateBenchmarkTable(benchmarkRuns = []) {
    let md = `| Benchmark | Domain | Classification | Tasks | Pass Rate | SOTA Baseline | Delta vs SOTA |\n`;
    md += `|:---|:---|:---:|:---:|:---:|:---:|:---:|\n`;

    for (const b of benchmarkRuns) {
      const sota = b.sotaReported !== undefined ? `${(b.sotaReported * 100).toFixed(1)}%` : 'Ref';
      const delta = b.sotaReported !== undefined ? `${((b.passRate - b.sotaReported) * 100).toFixed(1)}%` : 'N/A';
      md += `| **${b.name || b.benchmark}** | ${b.domain || 'General'} | \`${b.classification || 'REAL'}\` | ${b.totalTasks} | **${(b.passRate * 100).toFixed(1)}%** | ${sota} | ${delta.startsWith('-') ? delta : '+' + delta} |\n`;
    }

    return md;
  }

  /**
   * Format long horizon survival curve table
   */
  generateHorizonTable(horizonData = {}) {
    let md = `| Horizon Steps | Tasks Tested | Passed | Success Probability | Degradation Delta |\n`;
    md += `|:---:|:---:|:---:|:---:|:---:|\n`;

    const tiers = horizonData.tiers || [];
    let prevProb = 1.0;
    for (const t of tiers) {
      const prob = t.passRate;
      const delta = `${((prob - prevProb) * 100).toFixed(1)}%`;
      md += `| **${t.steps} steps** | ${t.total} | ${t.passed} | **${(prob * 100).toFixed(1)}%** | ${delta.startsWith('-') ? delta : '+' + delta} |\n`;
      prevProb = prob;
    }

    return md;
  }
}

const reportGenerator = new ReportGenerator();

module.exports = {
  ReportGenerator,
  reportGenerator
};
