/**
 * agi/verification/evidence-ledger.js
 * AGI 0.7 — Non-Verbal Proof & Evidence Ledger Engine
 * 
 * Verifies file mutations, exit codes, AST validity, and appends cryptographic SHA-256 logs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class EvidenceLedger {
  constructor(storagePath = null) {
    this.storagePath = storagePath || path.resolve(process.cwd(), 'agi/data/evidence-stream.jsonl');
    this._ensureStorage();
  }

  _ensureStorage() {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  computeHash(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  verifyAst(filePath) {
    if (!fs.existsSync(filePath)) return { valid: false, error: 'FILE_NOT_FOUND' };
    const ext = path.extname(filePath);

    try {
      if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
        execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
        return { valid: true, type: 'NODE_AST' };
      } else if (ext === '.json') {
        JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return { valid: true, type: 'JSON_SYNTAX' };
      }
      return { valid: true, type: 'GENERIC_FILE' };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  recordProof({ eventType, subsystem, artifactPath, exitCode = 0, details = {} }) {
    const timestamp = new Date().toISOString();
    const sha256 = artifactPath ? this.computeHash(artifactPath) : null;
    const ast = artifactPath ? this.verifyAst(artifactPath) : { valid: true };

    const entry = {
      id: `EV-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      eventType,
      subsystem,
      artifactPath,
      exitCode,
      sha256,
      astValid: ast.valid,
      details
    };

    fs.appendFileSync(this.storagePath, JSON.stringify(entry) + '\n', 'utf8');
    return entry;
  }

  getProofEntries() {
    if (!fs.existsSync(this.storagePath)) return [];
    const lines = fs.readFileSync(this.storagePath, 'utf8').trim().split('\n');
    return lines.filter(Boolean).map(l => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
}

const evidenceLedger = new EvidenceLedger();

module.exports = { EvidenceLedger, evidenceLedger };
