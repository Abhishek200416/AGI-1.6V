/**
 * matrix/knowledge/knowledge-fabric.js
 * MATRIX X1 — Knowledge Fabric
 * 
 * Persistent knowledge graph of claims, entities, relationships,
 * sources, freshness, and confidence.
 */

const fs = require('fs');
const path = require('path');
const { contradictionEngine } = require('./contradiction-engine');
const { storageFabric } = require('../storage/storage-fabric');

class KnowledgeFabric {
  constructor(options = {}) {
    this.claims = new Map();
    this.entities = new Map();
    this.init();
  }

  init() {
    const baseDir = storageFabric.activeDataRoot || path.join(__dirname, '../../.matrix_data');
    this.storageFile = path.join(baseDir, 'knowledge', 'matrix-knowledge.json');
    const dir = path.dirname(this.storageFile);
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    }
    this.loadFromDisk();
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        const data = JSON.parse(raw);
        for (const claim of (data.claims || [])) {
          this.claims.set(claim.id, claim);
        }
      }
    } catch (e) {}
  }

  persistToDisk() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storageFile, JSON.stringify({
        claims: Array.from(this.claims.values()),
        updatedAt: new Date().toISOString()
      }, null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Add a verified claim to the knowledge fabric
   */
  addClaim({
    entity,
    property,
    value,
    source,
    confidence = 0.9,
    timestamp = new Date().toISOString(),
    validUntil = null
  }) {
    // Check if an existing conflicting claim exists for (entity, property)
    const existing = Array.from(this.claims.values()).find(
      c => c.entity.toLowerCase() === entity.toLowerCase() && c.property.toLowerCase() === property.toLowerCase()
    );

    if (existing && existing.value !== value) {
      // Register contradiction
      contradictionEngine.registerContradiction({
        topic: `${entity} : ${property}`,
        claimA: `${property} is ${existing.value}`,
        sourceA: existing.source,
        dateA: existing.timestamp,
        confidenceA: existing.confidence,
        claimB: `${property} is ${value}`,
        sourceB: source,
        dateB: timestamp,
        confidenceB: confidence
      });
    }

    const id = `CLM-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const claim = {
      id,
      entity,
      property,
      value,
      source,
      confidence,
      timestamp,
      validUntil,
      status: 'VERIFIED'
    };

    this.claims.set(id, claim);
    this.persistToDisk();
    return claim;
  }

  queryEntity(entityName) {
    return Array.from(this.claims.values()).filter(
      c => c.entity.toLowerCase() === entityName.toLowerCase()
    );
  }

  getKnowledgeSummary() {
    return {
      totalClaims: this.claims.size,
      openContradictions: contradictionEngine.getOpenContradictions().length,
      recentClaims: Array.from(this.claims.values()).slice(-5)
    };
  }
}

const knowledgeFabric = new KnowledgeFabric();

module.exports = { KnowledgeFabric, knowledgeFabric };
