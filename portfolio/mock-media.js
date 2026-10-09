/**
 * portfolio/mock-media.js
 * Procedural Dynamic Video & Animation Generators
 * Renders realistic, high-tech animated canvas "video reels" for project cards.
 */

class MockMediaEngine {
  constructor() {
    this.canvases = [];
    this.animationId = null;
    this.startTime = performance.now();
  }

  init() {
    this.setupAgentSwarmCanvas("canvas-swarm");
    this.setupNeuralRaymarchCanvas("canvas-raymarch");
    this.setupKnowledgeGraphCanvas("canvas-graph");
    this.animate();
  }

  setupAgentSwarmCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Agent particles
    const agents = Array.from({ length: 24 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      color: i % 3 === 0 ? "#00f0ff" : i % 3 === 1 ? "#a855f7" : "#10b981",
      pulse: Math.random() * Math.PI,
      role: i === 0 ? "LEADER" : i % 4 === 0 ? "PLANNER" : "EXECUTOR"
    }));

    this.canvases.push({
      canvas,
      ctx,
      type: "swarm",
      agents
    });
  }

  setupNeuralRaymarchCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    this.canvases.push({
      canvas,
      ctx,
      type: "raymarch"
    });
  }

  setupKnowledgeGraphCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    const nodes = [
      { id: "M0", label: "Working Memory", x: 60, y: 50, tier: 1 },
      { id: "M1", label: "Episodic Log", x: 180, y: 40, tier: 2 },
      { id: "M2", label: "Semantic Graph", x: 300, y: 70, tier: 3 },
      { id: "M3", label: "Procedural AST", x: 100, y: 140, tier: 4 },
      { id: "M4", label: "Resource Ledger", x: 230, y: 130, tier: 5 },
      { id: "M5", label: "Safety Boundary", x: 340, y: 150, tier: 6 }
    ];

    const edges = [
      [0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [1, 4], [2, 5], [0, 4]
    ];

    this.canvases.push({
      canvas,
      ctx,
      type: "graph",
      nodes,
      edges,
      packetProgress: 0
    });
  }

  animate() {
    const time = (performance.now() - this.startTime) * 0.001;

    for (const item of this.canvases) {
      const { canvas, ctx, type } = item;
      const w = canvas.width;
      const h = canvas.height;

      if (type === "swarm") {
        this.renderSwarm(ctx, w, h, time, item.agents);
      } else if (type === "raymarch") {
        this.renderRaymarch(ctx, w, h, time);
      } else if (type === "graph") {
        this.renderGraph(ctx, w, h, time, item);
      }
    }

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  renderSwarm(ctx, w, h, time, agents) {
    ctx.fillStyle = "#03060c";
    ctx.fillRect(0, 0, w, h);

    // Subtle coordinate grid
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Agent connections
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      for (let j = i + 1; j < agents.length; j++) {
        const b = agents[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 75) {
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 * (1 - dist / 75)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Move & draw agents
    for (const a of agents) {
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < 10 || a.x > w - 10) a.vx *= -1;
      if (a.y < 10 || a.y > h - 10) a.vy *= -1;

      // Glow circle
      ctx.beginPath();
      ctx.arc(a.x, a.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = a.color;
      ctx.shadowColor = a.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Pulse ring on leaders
      if (a.role === "LEADER") {
        const radius = 6 + Math.sin(time * 4) * 4;
        ctx.strokeStyle = "rgba(0, 240, 255, 0.5)";
        ctx.beginPath();
        ctx.arc(a.x, a.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Telemetry HUD overlay
    ctx.fillStyle = "#00f0ff";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillText(`SWARM_NODES: ${agents.length} ACTIVE`, 12, h - 28);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText(`SYNC: 99.98% | LATENCY: ${(24 + Math.sin(time * 3) * 6).toFixed(1)}ms`, 12, h - 14);
  }

  renderRaymarch(ctx, w, h, time) {
    ctx.fillStyle = "#03050a";
    ctx.fillRect(0, 0, w, h);

    // Dynamic procedural energy ribbons / terrain waves
    const bands = 7;
    for (let b = 0; b < bands; b++) {
      ctx.beginPath();
      ctx.moveTo(0, h * 0.5);

      const freq = 0.015 + b * 0.003;
      const speed = time * 1.5 + b * 0.8;
      const amplitude = 35 + b * 6;
      const baseY = h * 0.45 + (b - bands / 2) * 14;

      for (let x = 0; x <= w; x += 6) {
        const y = baseY + Math.sin(x * freq + speed) * amplitude * Math.cos((x * 0.005) + time * 0.5);
        ctx.lineTo(x, y);
      }

      const alpha = 0.15 + (b / bands) * 0.35;
      const col = b % 2 === 0 ? `rgba(168, 85, 247, ${alpha})` : `rgba(0, 240, 255, ${alpha})`;
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Digital Scanline Effect
    ctx.fillStyle = "rgba(0, 240, 255, 0.03)";
    const scanY = (time * 60) % h;
    ctx.fillRect(0, scanY, w, 2);

    // Holographic Vector Crosshair
    const cx = w * 0.75;
    const cy = h * 0.35;
    ctx.strokeStyle = "rgba(0, 240, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx + 20, cy);
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    // Telemetry HUD
    ctx.fillStyle = "#a855f7";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillText("VOLUMETRIC_SHADER: ACTIVE (60 FPS)", 12, h - 28);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText(`RAYMARCH_STEPS: 128 | FOV: 75.0°`, 12, h - 14);
  }

  renderGraph(ctx, w, h, time, item) {
    ctx.fillStyle = "#02050b";
    ctx.fillRect(0, 0, w, h);

    const { nodes, edges } = item;

    // Draw Edges with pulsing signals
    for (const [i, j] of edges) {
      const n1 = nodes[i];
      const n2 = nodes[j];

      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.stroke();

      // Traveling data packet
      const packetT = (time * 0.8 + (i * 0.2 + j * 0.3)) % 1;
      const px = n1.x + (n2.x - n1.x) * packetT;
      const py = n1.y + (n2.y - n1.y) * packetT;

      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw Nodes
    for (const n of nodes) {
      const pulse = Math.sin(time * 3 + n.tier) * 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 6 + pulse * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = n.tier <= 3 ? "#00f0ff" : "#a855f7";
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillText(n.label, n.x - 25, n.y - 10);
    }

    // Telemetry HUD
    ctx.fillStyle = "#10b981";
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillText("10-TIER MEMORY RETENTION: 99.4%", 12, h - 28);
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fillText(`ENTROPY: 0.02 | EBBINGHAUS_DECAY: INTACT`, 12, h - 14);
  }
}

// Export instance
window.mockMediaEngine = new MockMediaEngine();
