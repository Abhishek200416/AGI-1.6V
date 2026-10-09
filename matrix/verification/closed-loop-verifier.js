/**
 * matrix/verification/closed-loop-verifier.js
 * MATRIX X1.2 — Closed-Loop State Verifier
 * 
 * Provides independent, orthogonal, non-verbal state mutation verification
 * for code, terminal, filesystem, and benchmark deliverables.
 * 
 * Prevents reward hacking and false success claims.
 * Follows Ponytail principle: pure Node.js fs, crypto, child_process.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class ClosedLoopVerifier {
  constructor() {
    this.verificationLog = [];
  }

  /**
   * Verify concrete file mutation with cryptographic hash diffing
   */
  verifyFileMutation({
    filePath,
    previousHash = null,
    expectedSubstrings = []
  }) {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return {
        passed: false,
        reason: `Target file does not exist: ${filePath}`,
        proofType: 'FILE_MUTATION'
      };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const currentHash = crypto.createHash('sha256').update(content).digest('hex');

    if (previousHash && previousHash === currentHash) {
      return {
        passed: false,
        reason: `File hash unchanged (${currentHash.slice(0, 8)}). No mutation occurred.`,
        proofType: 'FILE_MUTATION'
      };
    }

    for (const sub of expectedSubstrings) {
      if (!content.includes(sub)) {
        return {
          passed: false,
          reason: `Missing expected string in file: "${sub}"`,
          proofType: 'FILE_MUTATION'
        };
      }
    }

    const proof = {
      passed: true,
      filePath,
      currentHash,
      previousHash,
      fileSizeBytes: content.length,
      proofType: 'FILE_MUTATION',
      timestamp: new Date().toISOString()
    };
    this.verificationLog.push(proof);
    return proof;
  }

  /**
   * Verify JavaScript syntax validity using node --check
   */
  verifyJsSyntax(filePath) {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      return { passed: false, reason: `File not found: ${filePath}`, proofType: 'SYNTAX_CHECK' };
    }

    try {
      execSync(`"${process.execPath}" --check "${fullPath}"`, {
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf8'
      });
      const proof = {
        passed: true,
        filePath,
        proofType: 'SYNTAX_CHECK',
        timestamp: new Date().toISOString()
      };
      this.verificationLog.push(proof);
      return proof;
    } catch (err) {
      return {
        passed: false,
        filePath,
        error: err.stderr || err.message,
        proofType: 'SYNTAX_CHECK'
      };
    }
  }

  /**
   * Verify test execution with exit code 0 and stdout matching
   */
  verifyTestExecution({
    testScriptPath,
    expectedPassPattern = null,
    timeoutMs = 30000
  }) {
    const fullPath = path.resolve(process.cwd(), testScriptPath);
    if (!fs.existsSync(fullPath)) {
      return { passed: false, reason: `Test script not found: ${testScriptPath}`, proofType: 'TEST_EXECUTION' };
    }

    const startTime = Date.now();
    try {
      const stdout = execSync(`"${process.execPath}" "${fullPath}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeoutMs
      });
      const durationMs = Date.now() - startTime;

      if (expectedPassPattern) {
        const regex = new RegExp(expectedPassPattern);
        if (!regex.test(stdout)) {
          return {
            passed: false,
            reason: `Output did not match expected pass pattern '${expectedPassPattern}'`,
            stdoutSnippet: stdout.length > 500 ? stdout.slice(-500) : stdout,
            proofType: 'TEST_EXECUTION'
          };
        }
      }

      const proof = {
        passed: true,
        testScriptPath,
        durationMs,
        stdoutSnippet: stdout.length > 500 ? stdout.slice(-500) : stdout,
        proofType: 'TEST_EXECUTION',
        timestamp: new Date().toISOString()
      };
      this.verificationLog.push(proof);
      return proof;
    } catch (err) {
      return {
        passed: false,
        testScriptPath,
        exitCode: err.status || 1,
        stderrSnippet: (err.stderr || err.message || '').slice(0, 500),
        proofType: 'TEST_EXECUTION'
      };
    }
  }

  /**
   * Verify benchmark task output against formal assertion functions
   */
  verifyBenchmarkGrader(task, actualOutput, graderFn) {
    try {
      const gradeResult = graderFn(task, actualOutput);
      const passed = gradeResult === true || (gradeResult && gradeResult.passed === true);
      const proof = {
        passed,
        taskId: task.id || 'BENCH_TASK',
        details: gradeResult,
        proofType: 'BENCHMARK_GRADER',
        timestamp: new Date().toISOString()
      };
      this.verificationLog.push(proof);
      return proof;
    } catch (err) {
      return {
        passed: false,
        taskId: task.id || 'BENCH_TASK',
        error: err.message,
        proofType: 'BENCHMARK_GRADER'
      };
    }
  }

  getProofHistory() {
    return this.verificationLog;
  }
}

const closedLoopVerifier = new ClosedLoopVerifier();
module.exports = {
  ClosedLoopVerifier,
  closedLoopVerifier
};
