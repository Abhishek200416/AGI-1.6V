/**
 * agi/tests/security-suite.js
 * AGI 0.7 — Security Hardening & Cryptographic Ledger Verification Suite
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { McpSecurityGateway } = require('../security/mcp-security');
const { EvidenceLedger, GENESIS_HASH } = require('../verification/evidence-ledger');

console.log('====================================================');
console.log('AGI 0.7 — SECURITY HARDENING REGRESSION TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(`       Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------
// 1. MCP Path Containment & Realpath Tests (OWASP MCP-01)
// -----------------------------------------------------------
const testWorkspace = path.resolve(process.cwd());
const gateway = new McpSecurityGateway({ allowedRoots: [testWorkspace] });

runTest('Allow valid file path within workspace root', () => {
  const target = path.join(testWorkspace, 'agi/security/mcp-security.js');
  const resolved = gateway.validatePathContainment(target);
  assert.ok(resolved.toLowerCase().startsWith(testWorkspace.toLowerCase()));
});

runTest('Block directory traversal escaping workspace via parent segments', () => {
  assert.throws(() => {
    gateway.validatePathContainment('../../Windows/System32/cmd.exe');
  }, /escapes allowed workspace boundaries/);
});

runTest('Block prefix-spoofing attack (workspace_suffix evasion)', () => {
  const fakeDir = testWorkspace + '_malicious';
  assert.throws(() => {
    gateway.validatePathContainment(path.join(fakeDir, 'payload.js'));
  }, /escapes allowed workspace boundaries/);
});

runTest('Block null-byte injection in path argument', () => {
  assert.throws(() => {
    gateway.validatePathContainment('agi/security\0/secret.txt');
  }, /Null byte detected/);
});

// -----------------------------------------------------------
// 2. SSRF & URL Validation Tests (OWASP MCP-07)
// -----------------------------------------------------------
runTest('Allow legitimate external HTTPS endpoints', () => {
  assert.strictEqual(gateway.validateTargetUrl('https://api.github.com/repos'), true);
  assert.strictEqual(gateway.validateTargetUrl('https://huggingface.co/datasets'), true);
});

runTest('Block SSRF loopback localhost', () => {
  assert.throws(() => {
    gateway.validateTargetUrl('http://localhost:8080/metrics');
  }, /Forbidden destination host: localhost/);
});

runTest('Block SSRF loopback IP 127.0.0.1', () => {
  assert.throws(() => {
    gateway.validateTargetUrl('http://127.0.0.1:3000/api/keys');
  }, /Forbidden destination host: 127.0.0.1/);
});

runTest('Block SSRF cloud metadata endpoint 169.254.169.254', () => {
  assert.throws(() => {
    gateway.validateTargetUrl('http://169.254.169.254/latest/meta-data/');
  }, /Forbidden destination host: 169.254.169.254/);
});

runTest('Block private RFC 1918 subnets (192.168.x.x, 10.x.x.x)', () => {
  assert.throws(() => {
    gateway.validateTargetUrl('http://192.168.1.1/router-login');
  }, /Access to private RFC 1918 IP space is blocked/);
  assert.throws(() => {
    gateway.validateTargetUrl('http://10.0.0.5:9000/internal-db');
  }, /Access to private RFC 1918 IP space is blocked/);
});

runTest('Block non-HTTP protocols (file:, gopher:)', () => {
  assert.throws(() => {
    gateway.validateTargetUrl('file:///etc/shadow');
  }, /Forbidden protocol: file:/);
});

// -----------------------------------------------------------
// 3. Shell Injection Prevention Tests
// -----------------------------------------------------------
runTest('Allow benign command line argument strings', () => {
  assert.strictEqual(gateway.sanitizeShellArguments(['--model', 'gemini-3.8-flash-high', 'test.js']), true);
});

runTest('Block command chaining and metacharacters', () => {
  assert.throws(() => {
    gateway.sanitizeShellArguments(['--param', 'value; rm -rf /']);
  }, /Forbidden shell metacharacters detected/);
  assert.throws(() => {
    gateway.sanitizeShellArguments(['$(whoami)']);
  }, /Forbidden shell metacharacters detected/);
});

// -----------------------------------------------------------
// 4. HMAC-SHA256 Cryptographic Evidence Ledger Integrity Tests
// -----------------------------------------------------------
const tempLedgerPath = path.join(os.tmpdir(), `test-ledger-${Date.now()}.jsonl`);

runTest('Append cryptographically forward-chained evidence entries', () => {
  const ledger = new EvidenceLedger(tempLedgerPath, 'TEST-SECRET-KEY');
  const e1 = ledger.recordProof({ eventType: 'TASK_START', subsystem: 'Orchestrator', exitCode: 0 });
  assert.strictEqual(e1.previousHash, GENESIS_HASH);
  assert.ok(e1.entryHash && e1.entryHash.length === 64);

  const e2 = ledger.recordProof({ eventType: 'TASK_COMPLETE', subsystem: 'Verifier', exitCode: 0 });
  assert.strictEqual(e2.previousHash, e1.entryHash);
  assert.ok(e2.entryHash && e2.entryHash.length === 64);

  const check = ledger.verifyLedgerIntegrity();
  assert.strictEqual(check.valid, true);
  assert.strictEqual(check.totalEntries, 2);
  assert.strictEqual(check.headHash, e2.entryHash);
});

runTest('Detect tampering in historical ledger record', () => {
  const ledger = new EvidenceLedger(tempLedgerPath, 'TEST-SECRET-KEY');
  
  // Read raw lines and tamper with entry 1
  const rawLines = fs.readFileSync(tempLedgerPath, 'utf8').trim().split('\n');
  const entry1 = JSON.parse(rawLines[0]);
  entry1.exitCode = 137; // Tampered exit code
  rawLines[0] = JSON.stringify(entry1);
  fs.writeFileSync(tempLedgerPath, rawLines.join('\n') + '\n', 'utf8');

  // Verification must detect the corruption
  const tamperedCheck = ledger.verifyLedgerIntegrity();
  assert.strictEqual(tamperedCheck.valid, false);
  assert.strictEqual(tamperedCheck.brokenIndex, 0);
  assert.strictEqual(tamperedCheck.reason, 'ENTRY_HASH_CORRUPTION');

  // Clean up
  if (fs.existsSync(tempLedgerPath)) fs.unlinkSync(tempLedgerPath);
});

console.log('\n====================================================');
console.log(`SECURITY SUITE VERDICT: ${passedTests}/${totalTests} PASSED`);
console.log('====================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
