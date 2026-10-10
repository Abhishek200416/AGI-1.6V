/**
 * agi/tests/regression-guard-suite.js
 * AGI 0.7 — Continuous Quality Protection & Regression Guard Suite
 * 
 * Verifies that all 6 repaired failure modes (FAIL-BC-001, FAIL-BC-002, FAIL-MA-001,
 * FAIL-TB-001, FAIL-SEC-001, FAIL-SEC-002) and core AGI 0.7 subsystems remain strictly intact.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const { McpSecurityGateway } = require('../security/mcp-security');
const { EvidenceLedger, GENESIS_HASH } = require('../verification/evidence-ledger');
const { MasterOrchestrator } = require('../orchestration/master-orchestrator');
const { MemoryManager } = require('../memory/memory-manager');
const { ToolRegistry } = require('../tools/tool-registry');

console.log('===========================================================');
console.log('AGI 0.7 — CONTINUOUS REGRESSION GUARD VERIFICATION SUITE');
console.log('===========================================================\n');

let totalChecks = 0;
let passedChecks = 0;

async function runGuard(name, fn) {
  totalChecks++;
  try {
    await fn();
    console.log(`[GUARD PASS] Check ${totalChecks}: ${name}`);
    passedChecks++;
  } catch (err) {
    console.error(`[GUARD FAIL] Check ${totalChecks}: ${name}`);
    console.error(`             Error: ${err.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  // -----------------------------------------------------------
  // Guard 1 & 2: MCP Realpath & SSRF Security (FAIL-SEC-001)
  // -----------------------------------------------------------
  const gateway = new McpSecurityGateway({ allowedRoots: [process.cwd()] });

  await runGuard('Guard 1: Path containment prevents symlink & parent traversal', () => {
    assert.throws(() => gateway.validatePathContainment('../../../Windows/System32'), /escapes allowed workspace boundaries/);
    assert.throws(() => gateway.validatePathContainment('agi/test\0/exploit.js'), /Null byte detected/);
    const valid = gateway.validatePathContainment('agi/security/mcp-security.js');
    assert.ok(valid);
  });

  await runGuard('Guard 2: SSRF defense blocks loopback, cloud metadata & RFC 1918 subnets', () => {
    assert.throws(() => gateway.validateTargetUrl('http://127.0.0.1:8080'), /Forbidden destination host/);
    assert.throws(() => gateway.validateTargetUrl('http://169.254.169.254/latest'), /Forbidden destination host/);
    assert.throws(() => gateway.validateTargetUrl('http://192.168.1.1/admin'), /Access to private RFC 1918/);
    assert.strictEqual(gateway.validateTargetUrl('https://api.github.com'), true);
  });

  // -----------------------------------------------------------
  // Guard 3: HMAC-SHA256 Cryptographic Evidence Ledger (FAIL-SEC-002)
  // -----------------------------------------------------------
  await runGuard('Guard 3: Evidence ledger forward-chains hashes and detects tampering', () => {
    const tmpLedger = path.join(os.tmpdir(), `guard-ledger-${Date.now()}.jsonl`);
    const ledger = new EvidenceLedger(tmpLedger, 'GUARD-SECRET');
    
    const entry1 = ledger.recordProof({ eventType: 'TEST_A', exitCode: 0 });
    const entry2 = ledger.recordProof({ eventType: 'TEST_B', exitCode: 0 });
    assert.strictEqual(entry2.previousHash, entry1.entryHash);

    const check1 = ledger.verifyLedgerIntegrity();
    assert.strictEqual(check1.valid, true);

    // Deliberately tamper with entry 1
    const raw = fs.readFileSync(tmpLedger, 'utf8').trim().split('\n');
    const parsed1 = JSON.parse(raw[0]);
    parsed1.exitCode = 99;
    raw[0] = JSON.stringify(parsed1);
    fs.writeFileSync(tmpLedger, raw.join('\n') + '\n', 'utf8');

    const check2 = ledger.verifyLedgerIntegrity();
    assert.strictEqual(check2.valid, false);
    assert.strictEqual(check2.reason, 'ENTRY_HASH_CORRUPTION');

    if (fs.existsSync(tmpLedger)) fs.unlinkSync(tmpLedger);
  });

  // -----------------------------------------------------------
  // Guard 4: FSM Orchestrator State Transitions
  // -----------------------------------------------------------
  await runGuard('Guard 4: Orchestrator enforces strict FSM transitions', () => {
    const orch = new MasterOrchestrator();
    assert.strictEqual(orch.state, 'IDLE');
    orch.transitionTo('PLANNING');
    assert.strictEqual(orch.state, 'PLANNING');
    orch.transitionTo('EXECUTING');
    assert.strictEqual(orch.state, 'EXECUTING');
    orch.transitionTo('VERIFYING');
    assert.strictEqual(orch.state, 'VERIFYING');
    orch.transitionTo('COMPLETED');
    assert.strictEqual(orch.state, 'COMPLETED');
    assert.throws(() => orch.transitionTo('EXECUTING'), /Invalid state transition/);
  });

  // -----------------------------------------------------------
  // Guard 5: 10-Tier Durable Memory Subsystem
  // -----------------------------------------------------------
  await runGuard('Guard 5: 10-Tier Memory stores and recalls across tiers', () => {
    const mem = new MemoryManager();
    mem.remember('semantic', { key: 'pref_color', value: { color: 'navy blue' }, importance: 9 });
    mem.remember('episodic', { key: 'session_order_1', value: { item: 'coffee' }, importance: 7 });

    const recalled = mem.recall('semantic', 'navy blue');
    assert.ok(recalled.length > 0);
    assert.strictEqual(recalled[0].key, 'pref_color');
    assert.strictEqual(recalled[0].value.color, 'navy blue');
  });

  // -----------------------------------------------------------
  // Guard 6: Closed-World Tool Registry & OWASP Secret Scrubbing
  // -----------------------------------------------------------
  await runGuard('Guard 6: Tool registry validates parameters and scrubs secrets', async () => {
    const reg = new ToolRegistry();
    reg.registerTool({
      name: 'safe_echo',
      description: 'Echo message safely',
      parameters: { type: 'object', required: ['msg'], properties: { msg: { type: 'string' } } },
      handler: (args) => args.msg
    });

    const res1 = await reg.executeTool('safe_echo', { msg: 'Hello world' });
    assert.strictEqual(res1.result, 'Hello world');

    const res2 = await reg.executeTool('safe_echo', { msg: 'Token: sk-12345678901234567890123456789012' });
    assert.ok(!res2.result.includes('sk-1234567890'));
    assert.ok(res2.result.includes('[REDACTED_SECRET]'));
  });

  // -----------------------------------------------------------
  // Guard 7: Python Adapter Regression Suites (BrowseComp, MemoryArena, Tau-Bench)
  // -----------------------------------------------------------
  await runGuard('Guard 7: BrowseComp unit tests pass (FAIL-BC-001, FAIL-BC-002)', () => {
    execSync('.venv\\Scripts\\python.exe tests/test_browsecomp_repair.py', { stdio: 'pipe' });
  });

  await runGuard('Guard 8: MemoryArena unit tests pass (FAIL-MA-001)', () => {
    execSync('.venv\\Scripts\\python.exe tests/test_memoryarena_repair.py', { stdio: 'pipe' });
  });

  await runGuard('Guard 9: tau-bench unit tests pass (FAIL-TB-001)', () => {
    execSync('.venv\\Scripts\\python.exe tests/test_tau_bench_repair.py', { stdio: 'pipe' });
  });

  await runGuard('Guard 10: Failure registry contains all verified incidents', () => {
    const regPath = path.resolve('agi/data/failure-registry.json');
    assert.ok(fs.existsSync(regPath));
    const data = JSON.parse(fs.readFileSync(regPath, 'utf8'));
    const keys = Object.keys(data);
    assert.strictEqual(keys.length, 6);
    for (const k of keys) {
      assert.strictEqual(data[k].resolutionStatus, 'VERIFIED');
    }
  });

  console.log('\n===========================================================');
  console.log(`REGRESSION GUARD VERDICT: ${passedChecks}/${totalChecks} GUARDS INTACT`);
  console.log('===========================================================');

  if (passedChecks !== totalChecks) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error in regression guard:', err);
  process.exit(1);
});
