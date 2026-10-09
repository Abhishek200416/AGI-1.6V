/**
 * matrix/tests/antigravity-native-suite.js
 * MATRIX X1.1 — Antigravity Native Model Connection Validation Suite
 */

const assert = require('assert');
const { antigravityCliProvider } = require('../models/antigravity-provider');
const { modelRouter } = require('../models/model-router');
const { securityKernel } = require('../kernel/security-kernel');

async function runAntigravityNativeSuite() {
  console.log('==================================================================');
  console.log(' MATRIX X1.1 — ANTIGRAVITY NATIVE MODEL CONNECTION TEST SUITE');
  console.log('==================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  PASS [TEST ${total}]: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL [TEST ${total}]: ${name} -> ${e.message}`);
      throw e;
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  PASS [TEST ${total}]: ${name}`);
      passed++;
    } catch (e) {
      console.error(`  FAIL [TEST ${total}]: ${name} -> ${e.message}`);
      throw e;
    }
  }

  // 1. Provider Discovery
  await testAsync('Provider discovery detects CLI binary and lists models', async () => {
    const disco = await antigravityCliProvider.listModels(15000);
    assert(disco.success === true, 'listModels must succeed');
    assert(disco.models.length >= 10, 'Must discover at least 10 models');
    const hasFlash = disco.models.some(m => m.slug === 'gemini-3.8-flash-low' || m.slug === 'gemini-3.8-flash-medium');
    assert(hasFlash, 'Must discover Gemini 3.8 Flash model slugs');
  });

  // 2. Model Routing Integration
  test('ModelRouter routes low complexity to Gemini 3.8 Flash (CLI backed)', () => {
    const route = modelRouter.route({ complexity: 'LOW' });
    assert(route.selectedModel === 'gemini-3.8-flash', 'Default economical routing is gemini-3.8-flash');
    const modelMeta = modelRouter.models[route.selectedModel];
    assert(modelMeta.provider === 'Antigravity CLI', 'Provider is Antigravity CLI');
    assert(modelMeta.canonicalModelId === 'gemini-3.8-flash-low', 'Canonical slug is gemini-3.8-flash-low');
  });

  // 3. Secret Scrubbing on Prompts and Responses
  test('Secret scrubbing prevents API tokens and keys from leaking', () => {
    const raw = 'Calling model with secret api_key=secretkey_1234567890123456 and token=token_abcdefghijklmnopqrstuvwxyz123456';
    const scrubbed = securityKernel.scrubSecrets(raw);
    assert(!scrubbed.includes('secretkey_1234567890123456'), 'High-entropy key must be scrubbed');
    assert(!scrubbed.includes('token_abcdefghijklmnopqrstuvwxyz123456'), 'Token must be scrubbed');
    assert(scrubbed.includes('[REDACTED_API_KEY]'), 'Must replace with REDACTED_API_KEY tag');
  });

  // 4. Failure Handling & Invalid Model Reporting
  await testAsync('Invalid model slug reports explicit failure without fabricating', async () => {
    const failRes = await antigravityCliProvider.callModel({
      model: 'invalid-non-existent-model-slug-xyz',
      prompt: 'test',
      timeoutMs: 10000
    });
    assert(failRes.success === false, 'Invalid model must fail');
    assert(failRes.exitCode !== 0, 'Exit code must be non-zero');
    assert(failRes.output === null, 'Output must be null on failure');
  });

  // 5. Authenticated Live Model Invocation & JSON Response Parsing
  await testAsync('Live authenticated Gemini 3.8 Flash execution returns parsed output', async () => {
    const liveRes = await modelRouter.callModel({
      model: 'gemini-3.8-flash-low',
      prompt: 'Compute 12 + 15 and reply with just the number 27.',
      live: true,
      timeoutMs: 60000
    });
    assert(liveRes.success === true, 'Live invocation must succeed');
    assert(liveRes.authenticated === true, 'Must be marked authenticated');
    assert(liveRes.provider === 'Antigravity CLI', 'Provider must be Antigravity CLI');
    assert(liveRes.canonicalModel === 'gemini-3.8-flash-low', 'Canonical model must be gemini-3.8-flash-low');
    assert(liveRes.output && liveRes.output.includes('27'), `Output must contain 27, got: ${liveRes.output}`);
    assert(liveRes.tokensUsed > 0, 'Tokens used must be recorded');
    assert(liveRes.latencyMs > 0, 'Latency must be recorded');
  });

  console.log('\n==================================================================');
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: 0`);
  console.log('==================================================================');
  console.log('>>> 100% PASS: ANTIGRAVITY NATIVE MODEL CONNECTION FULLY OPERATIONAL <<<');

  return { total, passed, failed: 0 };
}

if (require.main === module) {
  runAntigravityNativeSuite()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Antigravity Native Suite Error:', err);
      process.exit(1);
    });
}

module.exports = { runAntigravityNativeSuite };
