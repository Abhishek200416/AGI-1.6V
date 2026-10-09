/**
 * matrix/tests/live-frontier-smoke-suite.js
 * MATRIX X1.1 — Frontier Multi-Model Live Smoke Test Suite
 * 
 * Executes the 5 canonical live smoke tests across all verified operational models:
 * 1. Arithmetic / Symbolic Deduction
 * 2. Structured JSON Generation
 * 3. Short Logic Reasoning
 * 4. Algorithmic Code Synthesis
 * 5. Grounded Factual Precision
 * 
 * Models evaluated:
 * - Gemini 3.8 Flash Low (Antigravity CLI)
 * - Gemini 3.1 Pro High (Antigravity CLI)
 * - Claude Sonnet 4.6 (Antigravity CLI)
 * - Claude Opus 4.6 Thinking (Antigravity CLI)
 * - GPT-OSS-120B Medium (Antigravity CLI)
 * - DeepSeek V4 Flash (GonkaRouter)
 * - MiniMax M2.7 (GonkaRouter)
 * - GLM 5.3 Flash (GonkaRouter)
 */

const { modelRouter } = require('../models/model-router');
const { evaluationLedger } = require('../evaluation/evaluation-ledger');

const SMOKE_TASKS = [
  {
    id: 'SMK-01-ARITH',
    name: 'Symbolic Arithmetic Precision',
    prompt: 'Compute 17 * 19 and reply with just the integer product.',
    verify: (out) => out && out.includes('323')
  },
  {
    id: 'SMK-02-JSON',
    name: 'Structured JSON Extraction',
    prompt: 'Extract server and status from: "Host cluster-prod-01 is operational". Output valid JSON only with keys "host" and "status".',
    verify: (out) => {
      try {
        const clean = out.replace(/```json|```/g, '').trim();
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start === -1 || end === -1) return false;
        const parsed = JSON.parse(clean.substring(start, end + 1));
        return parsed.host && parsed.status;
      } catch (e) {
        return false;
      }
    }
  },
  {
    id: 'SMK-03-REAS',
    name: 'Verifiable Logical Deduction',
    prompt: 'Premise 1: All matrix nodes are encrypted. Premise 2: Kernel-Alpha is a matrix node. Is Kernel-Alpha encrypted? Reply YES or NO.',
    verify: (out) => out && out.toUpperCase().includes('YES')
  },
  {
    id: 'SMK-04-CODE',
    name: 'Algorithmic Function Synthesis',
    prompt: 'Implement a javascript function `isPalindrome(str)` returning true if string is equal backwards. Return only the function.',
    verify: (out) => out && (out.includes('function') || out.includes('=>')) && out.includes('reverse')
  },
  {
    id: 'SMK-05-FACT',
    name: 'Physical Constant Grounding',
    prompt: 'What is the exact speed of light in vacuum in meters per second? Reply with the exact integer.',
    verify: (out) => out && out.includes('299792458') || out.includes('299,792,458')
  }
];

const TARGET_MODELS = [
  { id: 'deepseek-v4-flash', provider: 'GonkaRouter', name: 'DeepSeek-V4-Flash' },
  { id: 'minimax-m2.7', provider: 'GonkaRouter', name: 'MiniMax-M2.7' },
  { id: 'glm-5.3-flash', provider: 'GonkaRouter', name: 'GLM-5.3-Flash' },
  { id: 'gemini-3.8-flash-low', provider: 'Antigravity CLI', name: 'Gemini 3.8 Flash (Low)' },
  { id: 'gemini-3.1-pro-high', provider: 'Antigravity CLI', name: 'Gemini 3.1 Pro (High)' },
  { id: 'claude-sonnet-4-6', provider: 'Antigravity CLI', name: 'Claude Sonnet 4.6' },
  { id: 'gpt-oss-120b-medium', provider: 'Antigravity CLI', name: 'GPT-OSS 120B' }
];

async function runFrontierSmokeSuite() {
  console.log('==================================================================');
  console.log(' MATRIX X1.1 — FRONTIER MODEL LIVE SMOKE SUITE');
  console.log(' Scope: 7 Model Families across 5 Verifiable Smoke Challenges');
  console.log(' Mode: LIVE AUTHENTICATED REQUESTS');
  console.log('==================================================================\n');

  const modelResults = {};

  for (const m of TARGET_MODELS) {
    console.log(`\n------------------------------------------------------------------`);
    console.log(`[MODEL TESTING] ${m.name} (${m.id}) via ${m.provider}`);
    console.log(`------------------------------------------------------------------`);

    modelResults[m.id] = {
      modelId: m.id,
      name: m.name,
      provider: m.provider,
      tasks: [],
      passed: 0,
      total: SMOKE_TASKS.length,
      totalLatencyMs: 0,
      totalTokens: 0
    };

    for (const t of SMOKE_TASKS) {
      console.log(`  Executing Smoke Task: ${t.id} - ${t.name}...`);
      const res = await modelRouter.callModel({
        model: m.id,
        prompt: t.prompt,
        live: true,
        timeoutMs: 45000
      });

      const passed = res.success && t.verify(res.output);
      if (passed) modelResults[m.id].passed++;
      modelResults[m.id].totalLatencyMs += res.latencyMs || 0;
      modelResults[m.id].totalTokens += res.tokensUsed || 0;

      modelResults[m.id].tasks.push({
        taskId: t.id,
        name: t.name,
        passed,
        latencyMs: res.latencyMs,
        tokensUsed: res.tokensUsed,
        outputSnippet: res.output ? res.output.substring(0, 100).replace(/\n/g, ' ') : null,
        error: res.error
      });

      console.log(`    Result: ${passed ? 'PASS' : 'FAIL'} | Latency: ${res.latencyMs}ms | Tokens: ${res.tokensUsed || 0}`);
    }
  }

  console.log('\n==================================================================');
  console.log(' FRONTIER SMOKE SUITE SUMMARY SCOREBOARD');
  console.log('==================================================================');
  console.log('Model Name               | Provider        | Pass Rate | Avg Latency | Total Tokens');
  console.log('-------------------------|-----------------|-----------|-------------|-------------');
  for (const [mid, data] of Object.entries(modelResults)) {
    const rate = ((data.passed / data.total) * 100).toFixed(0);
    const avgLat = Math.round(data.totalLatencyMs / data.total);
    console.log(`${data.name.padEnd(24)} | ${data.provider.padEnd(15)} | ${data.passed}/${data.total} (${rate.padStart(3)}%) | ${(avgLat + 'ms').padStart(11)} | ${data.totalTokens.toString().padStart(12)}`);
  }
  console.log('==================================================================\n');

  return modelResults;
}

if (require.main === module) {
  runFrontierSmokeSuite()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Smoke suite error:', err);
      process.exit(1);
    });
}

module.exports = { runFrontierSmokeSuite, TARGET_MODELS, SMOKE_TASKS };
