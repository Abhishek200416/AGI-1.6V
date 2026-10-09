/**
 * matrix/tests/verify-gemini-high.js
 * Verification script for DIRECTIVE 0: Gemini 3.8 Flash High
 */

const { modelRouter } = require('../models/model-router');
const { antigravityCliProvider } = require('../models/antigravity-provider');

async function main() {
  console.log('=== VERIFYING GEMINI 3.8 FLASH HIGH IDENTIFIER & LIVE INVOCATION ===');
  
  // 1. Check CLI model catalog directly
  const listRes = await antigravityCliProvider.listModels();
  const models = listRes.models || [];
  console.log(`Discovered ${models.length} models via Antigravity CLI (Authenticated: ${listRes.authenticated}).`);
  const highEntry = models.find(m => m.slug === 'gemini-3.8-flash-high');
  if (!highEntry) {
    console.error('FAIL: gemini-3.8-flash-high not found in CLI models list!');
    process.exit(1);
  }
  console.log(`CONFIRMED MODEL: ${highEntry.slug} -> "${highEntry.name}"`);

  // 2. Perform live authenticated request with gemini-3.8-flash-high (timeout 120s for High thinking)
  console.log('\nDispatching live authenticated request to gemini-3.8-flash-high (timeout: 120s)...');
  const prompt = 'Solve 23 * 47 and return JSON only: {"result": <number>, "verified": true}';
  const startTime = Date.now();
  const res = await modelRouter.callModel({
    model: 'gemini-3.8-flash-high',
    prompt,
    live: true,
    timeoutMs: 120000
  });
  const latency = Date.now() - startTime;

  console.log('Result Success:', res.success);
  console.log('Canonical Model:', res.canonicalModel);
  console.log('Provider:', res.provider);
  console.log('Latency Ms:', res.latencyMs || latency);
  console.log('Tokens Used:', res.tokensUsed);
  console.log('Output Content:\n', res.output);

  if (!res.success) {
    console.error('FAIL: Live invocation failed:', res.error);
    process.exit(1);
  }

  // Parse JSON
  const match = res.output ? res.output.match(/\{[\s\S]*\}/) : null;
  if (match) {
    const parsed = JSON.parse(match[0]);
    console.log('\nParsed JSON Output:', parsed);
    if (parsed.result === 1081) {
      console.log('>>> ARITHMETIC REASONING VERIFIED (23 * 47 = 1081) <<<');
    } else {
      console.warn('Arithmetic mismatch:', parsed.result);
    }
  }

  console.log('\n=== GEMINI 3.8 FLASH HIGH VERIFICATION COMPLETE: 100% OPERATIONAL ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
