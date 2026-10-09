/**
 * matrix/capabilities/capability-graph.js
 * MATRIX X1 — Capability Graph, Gap Detector & Capability Composer
 * 
 * Implements:
 * - Directed graph of capabilities with typed edges: depends_on, provides, compatible_with, requires
 * - Capability Gap Detector (Section 16): AVAILABLE, MISSING, PARTIAL, UNKNOWN
 * - Capability Composer (Section 19): Synthesizes compound capabilities from multiple primitives
 * - Capability Confidence tracking (Section 72)
 */

const fs = require('fs');
const path = require('path');

const GAP_STATUS = {
  AVAILABLE: 'AVAILABLE',
  MISSING: 'MISSING',
  PARTIAL: 'PARTIAL',
  UNKNOWN: 'UNKNOWN'
};

class CapabilityGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.initNativeCapabilities();
  }

  initNativeCapabilities() {
    // Seed core nodes
    this.addNode({
      id: 'cap:filesystem',
      type: 'NATIVE_TOOL',
      name: 'Filesystem I/O',
      description: 'Atomic reading and writing of workspace files',
      confidence: 0.99,
      evidenceCount: 150,
      successRate: 0.99
    });
    this.addNode({
      id: 'cap:process_execution',
      type: 'NATIVE_TOOL',
      name: 'Host Process Execution',
      description: 'Deterministic shell command execution and script running',
      confidence: 0.98,
      evidenceCount: 120,
      successRate: 0.98
    });
    this.addNode({
      id: 'cap:browser_automation',
      type: 'TOOL_RUNTIME',
      name: 'Durable Browser Automation',
      description: 'DOM inspection, semantic navigation, and multi-tab session control',
      confidence: 0.95,
      evidenceCount: 45,
      successRate: 0.96
    });
    this.addNode({
      id: 'cap:computer_use',
      type: 'TOOL_RUNTIME',
      name: 'Computer Use Digital Controller',
      description: 'Window inspection, application lifecycle, and visual differencing',
      confidence: 0.94,
      evidenceCount: 30,
      successRate: 0.95
    });
    this.addNode({
      id: 'cap:storage_fabric',
      type: 'KERNEL_ENGINE',
      name: 'Storage Fabric',
      description: 'Multi-tier storage with external volume disconnect tolerance',
      confidence: 0.99,
      evidenceCount: 85,
      successRate: 1.0
    });
    this.addNode({
      id: 'cap:memory_fabric',
      type: 'KERNEL_ENGINE',
      name: 'Memory Fabric',
      description: '11-scope memory graph with epistemic tracking',
      confidence: 0.99,
      evidenceCount: 200,
      successRate: 0.99
    });
    this.addNode({
      id: 'cap:research_engine',
      type: 'COGNITIVE_ENGINE',
      name: 'Research Engine',
      description: 'Multi-stream source discovery and hypothesis synthesis',
      confidence: 0.92,
      evidenceCount: 40,
      successRate: 0.93
    });
    this.addNode({
      id: 'cap:market_intelligence',
      type: 'DOMAIN_ENGINE',
      name: 'Market Intelligence',
      description: 'Token-efficient market stream processing, backtesting, and paper trading',
      confidence: 0.95,
      evidenceCount: 60,
      successRate: 0.97
    });

    // Seed edges
    this.addEdge('cap:browser_automation', 'cap:process_execution', 'depends_on');
    this.addEdge('cap:computer_use', 'cap:process_execution', 'depends_on');
    this.addEdge('cap:research_engine', 'cap:memory_fabric', 'depends_on');
    this.addEdge('cap:memory_fabric', 'cap:storage_fabric', 'depends_on');
  }

  addNode(node) {
    this.nodes.set(node.id, {
      ...node,
      registeredAt: new Date().toISOString(),
      status: node.status || 'AVAILABLE',
      confidence: node.confidence || 0.85,
      evidenceCount: node.evidenceCount || 1,
      successRate: node.successRate || 1.0,
      failureRate: node.failureRate || 0.0,
      knownLimitations: node.knownLimitations || []
    });
  }

  addEdge(sourceId, targetId, relation) {
    this.edges.push({ sourceId, targetId, relation, createdAt: new Date().toISOString() });
  }

  findCapability(nameOrKeyword) {
    const q = nameOrKeyword.toLowerCase();
    for (const node of this.nodes.values()) {
      if (node.id.toLowerCase().includes(q) ||
          node.name.toLowerCase().includes(q) ||
          (node.description && node.description.toLowerCase().includes(q))) {
        return node;
      }
    }
    return null;
  }

  /**
   * Capability Gap Detector (Section 16)
   */
  detectGap(requiredCapabilities = []) {
    const analysis = {
      timestamp: new Date().toISOString(),
      requiredCount: requiredCapabilities.length,
      available: [],
      missing: [],
      partial: [],
      unknown: []
    };

    for (const req of requiredCapabilities) {
      const node = this.findCapability(req);
      if (!node) {
        analysis.missing.push({ name: req, status: GAP_STATUS.MISSING });
      } else if (node.status === 'DEGRADED' || node.confidence < 0.7) {
        analysis.partial.push({ name: req, node, status: GAP_STATUS.PARTIAL });
      } else {
        analysis.available.push({ name: req, node, status: GAP_STATUS.AVAILABLE });
      }
    }

    analysis.hasGap = analysis.missing.length > 0 || analysis.partial.length > 0;
    return analysis;
  }

  /**
   * Capability Composer: Synthesize compound capability from parts (Section 19)
   */
  composeCapability({ name, domain = 'ENGINEERING', componentIds = [], workflowDescription = '' }) {
    const compId = `cap:compound_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    // Check missing sub-components
    const missing = componentIds.filter(id => !this.nodes.has(id));
    if (missing.length > 0) {
      return { success: false, error: `Cannot compose: missing dependencies [${missing.join(', ')}]` };
    }

    const compoundNode = {
      id: compId,
      type: 'COMPOUND_CAPABILITY',
      name,
      domain,
      description: `Synthesized compound capability combining: ${componentIds.join(', ')}`,
      workflowDescription,
      components: componentIds,
      confidence: 0.90,
      status: 'AVAILABLE'
    };

    this.addNode(compoundNode);
    for (const cid of componentIds) {
      this.addEdge(compId, cid, 'depends_on');
    }

    return {
      success: true,
      compoundNode,
      edgesCreated: componentIds.length
    };
  }

  updateConfidence(capabilityId, success = true) {
    if (this.nodes.has(capabilityId)) {
      const node = this.nodes.get(capabilityId);
      node.evidenceCount++;
      const alpha = 0.1;
      const target = success ? 1.0 : 0.0;
      node.confidence = Math.round(((node.confidence * (1 - alpha)) + (target * alpha)) * 100) / 100;
      node.lastVerified = new Date().toISOString();
    }
  }

  getAllNodes() {
    return Array.from(this.nodes.values());
  }

  getGraphSummary() {
    return {
      totalCapabilities: this.nodes.size,
      totalRelationships: this.edges.length,
      nodes: Array.from(this.nodes.values()).map(n => ({ id: n.id, type: n.type, name: n.name, confidence: n.confidence }))
    };
  }
}

const capabilityGraph = new CapabilityGraph();

module.exports = { CapabilityGraph, capabilityGraph, GAP_STATUS };
