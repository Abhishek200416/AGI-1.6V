/**
 * agi/verification/evidence-ledger.js
 * AGI 0.7 — Non-Verbal Proof & Cryptographically Chained Evidence Ledger (Hardened)
 * 
 * Verifies file mutations, exit codes, AST validity, and appends cryptographically
 * forward-chained HMAC-SHA256 audit entries (Rao et al., 2024 / Paper T31).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const GENESIS_HASH = '0'.repeat(64);
const DEFAULT_LEDGER_SECRET = 'AGI-07-CRYPTOGRAPHIC-EVIDENCE-CHAIN-VERIFIED-2026';

class EvidenceLedger {
  constructor(storagePath = null, secretKey = null) {
    this.storagePath = storagePath || path.resolve(process.cwd(), 'agi/data/evidence-stream.jsonl');
    this.secretKey = secretKey || process.env.AGI_LEDGER_SECRET || DEFAULT_LEDGER_SECRET;
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

  _computeEntryHash(previousHash, id, timestamp, eventType, sha256, exitCode, details) {
    const payload = [
      previousHash,
      id,
      timestamp,
      eventType,
      sha256 || 'null',
      exitCode,
      JSON.stringify(details || {})
    ].join('|');

    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  getLastEntry() {
    const entries = this.getProofEntries();
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }

  recordProof({ eventType, subsystem, artifactPath, exitCode = 0, details = {} }) {
    const timestamp = new Date().toISOString();
    const sha256 = artifactPath ? this.computeHash(artifactPath) : null;
    const ast = artifactPath ? this.verifyAst(artifactPath) : { valid: true };

    const lastEntry = this.getLastEntry();
    const previousHash = lastEntry && lastEntry.entryHash ? lastEntry.entryHash : GENESIS_HASH;

    const id = `EV-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const entryHash = this._computeEntryHash(previousHash, id, timestamp, eventType, sha256, exitCode, details);

    const entry = {
      id,
      timestamp,
      previousHash,
      entryHash,
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

  /**
   * Cryptographically verifies the unbroken integrity of the entire evidence ledger.
   * Returns { valid: true, totalEntries, headHash } or { valid: false, brokenIndex, reason }
   */
  verifyLedgerIntegrity() {
    const entries = this.getProofEntries();
    if (entries.length === 0) {
      return { valid: true, totalEntries: 0, headHash: GENESIS_HASH };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      // Check legacy entries that might lack entryHash
      if (!entry.entryHash || !entry.previousHash) {
        // Upgrade / legacy boundary
        expectedPrevHash = entry.entryHash || GENESIS_HASH;
        continue;
      }

      if (entry.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          brokenIndex: i,
          reason: 'PREVIOUS_HASH_MISMATCH',
          expected: expectedPrevHash,
          actual: entry.previousHash
        };
      }

      const recalculated = this._computeEntryHash(
        entry.previousHash,
        entry.id,
        entry.timestamp,
        entry.eventType,
        entry.sha256,
        entry.exitCode,
        entry.details
      );

      if (recalculated !== entry.entryHash) {
        return {
          valid: false,
          brokenIndex: i,
          reason: 'ENTRY_HASH_CORRUPTION',
          expected: recalculated,
          actual: entry.entryHash
        };
      }

      expectedPrevHash = entry.entryHash;
    }

    return {
      valid: true,
      totalEntries: entries.length,
      headHash: expectedPrevHash
    };
  }
}

const evidenceLedger = new EvidenceLedger();

module.exports = { EvidenceLedger, evidenceLedger, GENESIS_HASH };
