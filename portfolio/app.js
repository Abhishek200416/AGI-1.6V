/**
 * portfolio/app.js
 * 3D Spatial Canvas Warp Engine, Procedural Video Showreel,
 * Interactive 3D Card Tilt, Cyber Terminal REPL, & Web Audio Synthesizer.
 */

// ==========================================
// 1. WEB AUDIO SYNTHESIZER ENGINE
// ==========================================
class CyberAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.enabled = true;
      }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
      this.enabled = true;
    }
  }

  toggle() {
    if (!this.ctx) {
      this.init();
      return this.enabled;
    }
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playBlip(freq = 880, duration = 0.08, type = 'sine') {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, this.ctx.currentTime + duration);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playUplink() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [440, 660, 880, 1320].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.06, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.15);
      });
    } catch (e) {}
  }
}

const audio = new CyberAudioEngine();

// ==========================================
// 2. 3D WEBGL / CANVAS SPACE WARP ENGINE
// ==========================================
class SpatialWarpEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.width = 0;
    this.height = 0;
    this.particles = [];
    this.numParticles = 550;
    
    // Camera & Scroll State
    this.scrollY = window.scrollY;
    this.targetScrollY = window.scrollY;
    this.scrollVelocity = 0;
    this.lastScrollY = window.scrollY;
    
    // Mouse Parallax
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;
    
    // 3D Polyhedron (Tesseract / Hypercube Projection)
    this.polyRotX = 0;
    this.polyRotY = 0;
    this.polyRotZ = 0;
    this.initTesseract();

    this.resize();
    this.initParticles();
    this.bindEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 2400,
        y: (Math.random() - 0.5) * 2400,
        z: Math.random() * 2000,
        pz: 0,
        color: i % 5 === 0 ? '#00f0ff' : i % 5 === 1 ? '#a855f7' : i % 5 === 2 ? '#10b981' : '#ffffff',
        size: Math.random() * 1.8 + 0.8
      });
    }
  }

  initTesseract() {
    // 16 vertices of a 4D hypercube projected into 3D
    this.tesseractVertices = [];
    for (let x = -1; x <= 1; x += 2) {
      for (let y = -1; y <= 1; y += 2) {
        for (let z = -1; z <= 1; z += 2) {
          for (let w = -1; w <= 1; w += 2) {
            this.tesseractVertices.push([x, y, z, w]);
          }
        }
      }
    }
    // Connect vertices that differ in only 1 coordinate
    this.tesseractEdges = [];
    for (let i = 0; i < this.tesseractVertices.length; i++) {
      for (let j = i + 1; j < this.tesseractVertices.length; j++) {
        let diff = 0;
        for (let k = 0; k < 4; k++) {
          if (this.tesseractVertices[i][k] !== this.tesseractVertices[j][k]) diff++;
        }
        if (diff === 1) {
          this.tesseractEdges.push([i, j]);
        }
      }
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('scroll', () => {
      this.targetScrollY = window.scrollY;
    }, { passive: true });
    window.addEventListener('mousemove', (e) => {
      this.targetMouseX = (e.clientX / this.width - 0.5) * 2;
      this.targetMouseY = (e.clientY / this.height - 0.5) * 2;
    });
  }

  animate() {
    // Smooth Lerp
    this.scrollY += (this.targetScrollY - this.scrollY) * 0.1;
    this.scrollVelocity = (this.scrollY - this.lastScrollY);
    this.lastScrollY = this.scrollY;

    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    // Render Canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Deep Cyber Background Gradient
    const grad = this.ctx.createRadialGradient(
      this.width * 0.5 + this.mouseX * 100,
      this.height * 0.4 + this.mouseY * 100,
      50,
      this.width * 0.5,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.8
    );
    grad.addColorStop(0, 'rgba(10, 20, 38, 0.5)');
    grad.addColorStop(0.5, 'rgba(6, 9, 16, 0.85)');
    grad.addColorStop(1, '#05070c');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Render 3D Perspective Horizon Grid
    this.renderHorizonGrid();

    // Render 3D Starfield Warp
    this.renderParticles();

    // Render Floating 3D Hypercube / Tesseract
    this.renderTesseract();

    requestAnimationFrame(this.animate);
  }

  renderHorizonGrid() {
    const fov = 400;
    const cx = this.width * 0.5 + this.mouseX * 40;
    const cy = this.height * 0.75 + this.mouseY * 30;
    const gridY = 320;
    const maxZ = 1600;
    const stepX = 140;
    const stepZ = 120;
    const zOffset = (this.scrollY * 1.5) % stepZ;

    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';

    // Depth Lines (Longitudinal)
    for (let x = -1400; x <= 1400; x += stepX) {
      const zNear = 80;
      const zFar = maxZ;

      const scaleNear = fov / (fov + zNear);
      const scaleFar = fov / (fov + zFar);

      const sx1 = cx + x * scaleNear;
      const sy1 = cy + gridY * scaleNear;
      const sx2 = cx + x * scaleFar;
      const sy2 = cy + gridY * scaleFar;

      this.ctx.beginPath();
      this.ctx.moveTo(sx1, sy1);
      this.ctx.lineTo(sx2, sy2);
      this.ctx.stroke();
    }

    // Horizontal Lines (Transverse)
    for (let z = 80; z <= maxZ; z += stepZ) {
      const currentZ = z - zOffset;
      if (currentZ < 60) continue;

      const scale = fov / (fov + currentZ);
      const sy = cy + gridY * scale;
      const sx1 = cx - 1400 * scale;
      const sx2 = cx + 1400 * scale;

      const alpha = Math.max(0, 0.12 * (1 - currentZ / maxZ));
      this.ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.moveTo(sx1, sy);
      this.ctx.lineTo(sx2, sy);
      this.ctx.stroke();
    }
  }

  renderParticles() {
    const fov = 500;
    const cx = this.width * 0.5 + this.mouseX * 50;
    const cy = this.height * 0.5 + this.mouseY * 50;
    const speed = 2.5 + Math.abs(this.scrollVelocity) * 0.85;

    for (const p of this.particles) {
      p.pz = p.z;
      p.z -= speed;

      // Wrap around depth
      if (p.z <= 10) {
        p.z = 2000;
        p.pz = 2000;
        p.x = (Math.random() - 0.5) * 2400;
        p.y = (Math.random() - 0.5) * 2400;
      }

      const k = fov / p.z;
      const px = p.x * k + cx;
      const py = p.y * k + cy;

      const pk = fov / p.pz;
      const prevX = p.x * pk + cx;
      const prevY = p.y * pk + cy;

      if (px >= 0 && px <= this.width && py >= 0 && py <= this.height) {
        const depthAlpha = Math.min(1, Math.max(0.1, (1 - p.z / 2000) * 1.2));
        
        // Motion Streak during fast scroll
        if (Math.abs(this.scrollVelocity) > 3) {
          this.ctx.strokeStyle = p.color;
          this.ctx.globalAlpha = depthAlpha * 0.8;
          this.ctx.lineWidth = Math.min(3, p.size * k * 0.7);
          this.ctx.beginPath();
          this.ctx.moveTo(prevX, prevY);
          this.ctx.lineTo(px, py);
          this.ctx.stroke();
        } else {
          this.ctx.fillStyle = p.color;
          this.ctx.globalAlpha = depthAlpha;
          this.ctx.beginPath();
          this.ctx.arc(px, py, Math.max(0.6, p.size * k * 0.5), 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
    this.ctx.globalAlpha = 1.0;
  }

  renderTesseract() {
    // Slowly rotate based on time and scroll
    this.polyRotX += 0.008 + this.scrollVelocity * 0.001;
    this.polyRotY += 0.012;
    this.polyRotZ += 0.006;

    // Anchor position in 3D space near the top-right hero / showreel
    const fov = 450;
    const cx = this.width * 0.82 + this.mouseX * 30;
    const cy = this.height * 0.35 + (this.scrollY * -0.15) + this.mouseY * 30;
    const size = 85;

    // 4D Rotation matrix (XW and YZ planes)
    const angle4D = performance.now() * 0.0015;
    const cos4 = Math.cos(angle4D);
    const sin4 = Math.sin(angle4D);

    const projected3D = this.tesseractVertices.map(v => {
      let [x, y, z, w] = v;
      
      // 4D Rotation in XW
      const xRot = x * cos4 - w * sin4;
      const wRot = x * sin4 + w * cos4;
      
      // 4D to 3D stereographic projection
      const dist4D = 2.4;
      const wScale = 1 / (dist4D - wRot);
      let p3x = xRot * wScale * size;
      let p3y = y * wScale * size;
      let p3z = z * wScale * size;

      // 3D Euler Rotations
      // RotX
      let y1 = p3y * Math.cos(this.polyRotX) - p3z * Math.sin(this.polyRotX);
      let z1 = p3y * Math.sin(this.polyRotX) + p3z * Math.cos(this.polyRotX);
      // RotY
      let x2 = p3x * Math.cos(this.polyRotY) + z1 * Math.sin(this.polyRotY);
      let z2 = -p3x * Math.sin(this.polyRotY) + z1 * Math.cos(this.polyRotY);
      // RotZ
      let x3 = x2 * Math.cos(this.polyRotZ) - y1 * Math.sin(this.polyRotZ);
      let y3 = x2 * Math.sin(this.polyRotZ) + y1 * Math.cos(this.polyRotZ);

      // Project 3D to 2D
      const depth = z2 + 350;
      const projScale = fov / depth;
      return {
        x: cx + x3 * projScale,
        y: cy + y3 * projScale,
        z: depth
      };
    });

    // Render Edges
    this.ctx.lineWidth = 1.2;
    for (const [i, j] of this.tesseractEdges) {
      const p1 = projected3D[i];
      const p2 = projected3D[j];

      const avgZ = (p1.z + p2.z) * 0.5;
      const alpha = Math.max(0.15, Math.min(0.65, 1 - (avgZ - 200) / 300));
      this.ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();
    }

    // Render Vertices
    for (const p of projected3D) {
      this.ctx.fillStyle = '#a855f7';
      this.ctx.shadowColor = '#a855f7';
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }
}

// ==========================================
// 3. 3D INTERACTIVE TILT ENGINE
// ==========================================
class CardTiltEngine {
  constructor() {
    this.cards = document.querySelectorAll('.glass-panel, .project-card, .hero-avatar-card, .showreel-frame');
    this.bindEvents();
  }

  bindEvents() {
    this.cards.forEach(card => {
      card.addEventListener('mousemove', (e) => this.handleMove(e, card));
      card.addEventListener('mouseleave', () => this.handleLeave(card));
      card.addEventListener('mouseenter', () => audio.playBlip(1200, 0.03, 'sine'));
    });
  }

  handleMove(e, card) {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalize -1 to 1
    const normX = (x / rect.width - 0.5) * 2;
    const normY = (y / rect.height - 0.5) * 2;

    const rotX = -normY * 9;
    const rotY = normX * 9;

    card.style.transform = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.setProperty('--mouse-x', `${(x / rect.width * 100).toFixed(1)}%`);
    card.style.setProperty('--mouse-y', `${(y / rect.height * 100).toFixed(1)}%`);
  }

  handleLeave(card) {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  }
}

// ==========================================
// 4. PROCEDURAL 3D VIDEO SHOWREEL ENGINE
// ==========================================
class ProceduralShowreelEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.currentChannel = 0;
    this.isPlaying = true;
    this.startTime = performance.now();
    this.frameTime = 0;
    this.eqBars = document.querySelectorAll('.eq-bar-item');

    this.channels = [
      { name: "NEURAL CORE // ATTENTION WEIGHTS", id: "neural" },
      { name: "SPATIAL SLAM // AUTONOMOUS LIDAR", id: "spatial" },
      { name: "QUANTUM MANIFOLD // BLOCH SPHERE", id: "quantum" },
      { name: "CYBER MATRIX // DISASSEMBLY STREAM", id: "matrix" }
    ];

    this.bindControls();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  bindControls() {
    const pills = document.querySelectorAll('.channel-pill');
    pills.forEach((pill, idx) => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentChannel = idx;
        const hudTitle = document.getElementById('hud-channel-name');
        if (hudTitle) hudTitle.textContent = this.channels[idx].name;
        audio.playBlip(750, 0.08, 'triangle');
      });
    });

    const playBtn = document.getElementById('btn-play-pause');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.isPlaying = !this.isPlaying;
        playBtn.innerHTML = this.isPlaying ? '❚❚ PAUSE' : '▶ PLAY';
        audio.playBlip(600, 0.05, 'square');
      });
    }

    const fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const frame = document.querySelector('.showreel-frame');
        if (!document.fullscreenElement) {
          if (frame.requestFullscreen) frame.requestFullscreen();
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
        audio.playBlip(900, 0.05, 'sine');
      });
    }
  }

  animate(now) {
    if (this.isPlaying) {
      this.frameTime = (now - this.startTime) * 0.001;
    }

    const w = this.canvas.width = this.canvas.clientWidth;
    const h = this.canvas.height = this.canvas.clientHeight;

    // Render active channel
    switch (this.currentChannel) {
      case 0:
        this.renderNeuralChannel(w, h, this.frameTime);
        break;
      case 1:
        this.renderSpatialChannel(w, h, this.frameTime);
        break;
      case 2:
        this.renderQuantumChannel(w, h, this.frameTime);
        break;
      case 3:
        this.renderMatrixChannel(w, h, this.frameTime);
        break;
    }

    // Update Live Timecode
    const tcEl = document.getElementById('hud-timecode');
    if (tcEl) {
      const mins = Math.floor(this.frameTime / 60).toString().padStart(2, '0');
      const secs = Math.floor(this.frameTime % 60).toString().padStart(2, '0');
      const millis = Math.floor((this.frameTime * 100) % 100).toString().padStart(2, '0');
      tcEl.textContent = `REC 00:${mins}:${secs}:${millis}`;
    }

    // Animate Audio Equalizer Bars
    if (this.eqBars.length > 0 && this.isPlaying) {
      this.eqBars.forEach((bar, i) => {
        const height = Math.sin(this.frameTime * 6 + i * 0.7) * 8 + Math.cos(this.frameTime * 10 + i * 1.2) * 5 + 10;
        bar.style.height = `${Math.max(3, height)}px`;
      });
    }

    requestAnimationFrame(this.animate);
  }

  renderNeuralChannel(w, h, t) {
    this.ctx.fillStyle = '#03060f';
    this.ctx.fillRect(0, 0, w, h);

    // Neural Grid Background
    const cols = 8;
    const rows = 5;
    const spacingX = w / (cols + 1);
    const spacingY = h / (rows + 1);

    // Draw synapses
    this.ctx.lineWidth = 1;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const x1 = spacingX * (c + 1);
        const y1 = spacingY * (r + 1);

        if (c < cols - 1) {
          for (let nextR = 0; nextR < rows; nextR++) {
            const x2 = spacingX * (c + 2);
            const y2 = spacingY * (nextR + 1);

            const activePulse = (Math.sin(t * 3 + c * 1.5 + r + nextR) + 1) * 0.5;
            this.ctx.strokeStyle = `rgba(0, 240, 255, ${0.05 + activePulse * 0.25})`;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            // Moving synaptic pulse token
            if (activePulse > 0.6) {
              const pulsePos = (t * 1.8 + c * 0.3) % 1;
              const px = x1 + (x2 - x1) * pulsePos;
              const py = y1 + (y2 - y1) * pulsePos;
              this.ctx.fillStyle = '#00f0ff';
              this.ctx.beginPath();
              this.ctx.arc(px, py, 2, 0, Math.PI * 2);
              this.ctx.fill();
            }
          }
        }

        // Neuron Node
        const pulse = Math.sin(t * 4 + c * 0.8 + r) * 2;
        this.ctx.fillStyle = c % 2 === 0 ? '#00f0ff' : '#a855f7';
        this.ctx.beginPath();
        this.ctx.arc(x1, y1, 4 + pulse * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Telemetry Loss Curve Overlay
    this.ctx.strokeStyle = '#10b981';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    for (let x = 30; x < 260; x += 5) {
      const curveY = h - 60 - Math.exp(-x * 0.015) * 45 + Math.sin(x * 0.1 + t * 4) * 4;
      if (x === 30) this.ctx.moveTo(x, curveY);
      else this.ctx.lineTo(x, curveY);
    }
    this.ctx.stroke();

    this.ctx.fillStyle = '#10b981';
    this.ctx.font = '10px "JetBrains Mono", monospace';
    this.ctx.fillText(`CROSS-ENTROPY LOSS: ${(0.042 + Math.sin(t) * 0.005).toFixed(4)}`, 30, h - 35);
  }

  renderSpatialChannel(w, h, t) {
    this.ctx.fillStyle = '#02050b';
    this.ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;

    // Concentric LiDAR Radar Rings
    for (let r = 50; r <= 220; r += 55) {
      this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Radar Sweep Line
    const sweepAngle = (t * 2.5) % (Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx + Math.cos(sweepAngle) * 220, cy + Math.sin(sweepAngle) * 220);
    this.ctx.stroke();

    // Radar Sweep Fading Sector
    const sweepGrad = this.ctx.createRadialGradient(cx, cy, 10, cx, cy, 220);
    sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
    sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    this.ctx.fillStyle = sweepGrad;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.arc(cx, cy, 220, sweepAngle - 0.4, sweepAngle);
    this.ctx.closePath();
    this.ctx.fill();

    // Tracked Spatial Targets with Bounding Boxes
    const targets = [
      { x: cx + Math.cos(t * 0.8) * 110, y: cy + Math.sin(t * 0.8) * 80, label: "DRONE_ALF-01" },
      { x: cx + Math.cos(t * -1.2) * 160, y: cy + Math.sin(t * -1.2) * 130, label: "ROVER_UNIT-9" }
    ];

    targets.forEach(tgt => {
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.strokeRect(tgt.x - 14, tgt.y - 14, 28, 28);
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.font = '9px "JetBrains Mono", monospace';
      this.ctx.fillText(tgt.label, tgt.x - 22, tgt.y - 20);
      this.ctx.fillText(`DIST: ${Math.hypot(tgt.x - cx, tgt.y - cy).toFixed(1)}m`, tgt.x - 22, tgt.y + 26);
    });
  }

  renderQuantumChannel(w, h, t) {
    this.ctx.fillStyle = '#05030e';
    this.ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = 130;

    // 3D Bloch Sphere Outline & Latitude Rings
    this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Equator Ellipse
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, radius, radius * 0.35, 0, 0, Math.PI * 2);
    this.ctx.stroke();

    // Meridian Ellipse
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, radius * 0.35, radius, 0, 0, Math.PI * 2);
    this.ctx.stroke();

    // Rotating Quantum State Vector |Psi>
    const psiTheta = t * 1.5;
    const psiPhi = t * 2.2;
    const vx = Math.sin(psiTheta) * Math.cos(psiPhi) * radius;
    const vy = Math.cos(psiTheta) * radius * 0.8;

    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx + vx, cy - vy);
    this.ctx.stroke();

    this.ctx.fillStyle = '#00f0ff';
    this.ctx.beginPath();
    this.ctx.arc(cx + vx, cy - vy, 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#f8fafc';
    this.ctx.font = '11px "JetBrains Mono", monospace';
    this.ctx.fillText('|Ψ⟩ = 0.707|0⟩ + 0.707e^(iφ)|1⟩', cx + vx + 12, cy - vy);
    this.ctx.fillText(`ENTANGLEMENT FIDELITY: 99.87%`, 30, h - 35);
  }

  renderMatrixChannel(w, h, t) {
    this.ctx.fillStyle = 'rgba(2, 6, 12, 0.25)';
    this.ctx.fillRect(0, 0, w, h);

    const cols = Math.floor(w / 18);
    const chars = "0101XYZΩλμ∇∂∫§AI⚡AGIΨΦθ";

    this.ctx.fillStyle = '#10b981';
    this.ctx.font = '12px "JetBrains Mono", monospace';

    for (let i = 0; i < cols; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const y = ((t * 220 + i * 45) % (h + 50));
      this.ctx.fillText(char, i * 18, y);
    }

    // Centered Holographic Core Tag
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.font = '14px "JetBrains Mono", monospace';
    this.ctx.fillText("[AUTONOMOUS EXECUTION LOOP ONLINE]", w * 0.5 - 140, h * 0.5);
  }
}

// ==========================================
// 5. INTERACTIVE HACKER TERMINAL REPL
// ==========================================
class CyberTerminalREPL {
  constructor() {
    this.input = document.getElementById('terminal-input');
    this.body = document.getElementById('terminal-body');
    if (!this.input || !this.body) return;

    this.commands = {
      help: () => [
        "AVAILABLE AGENT COMMANDS:",
        "  about     - View engineer background, architecture philosophy",
        "  projects  - Inspect deployed projects and verification metrics",
        "  skills    - Print full technical competency radar",
        "  matrix    - Stream cyber glyph neural feed",
        "  eval      - Run synthetic AGI benchmark validator test",
        "  stats     - Print system runtime specs & telemetry",
        "  contact   - Display encrypted comms links",
        "  audio     - Toggle spatial Web Audio synth feedback",
        "  clear     - Wipe terminal screen"
      ],
      about: () => [
        "ARCHITECT: Abhishek // AGI Systems & Spatial Perception Engineer",
        "SPECIALIZATION: Distributed Autonomous Agents, Neural Raymarching, Synthetic Verification",
        "MISSION: Building deterministic, zero-hallucination agent architectures with high-fidelity 3D interfaces.",
        "STATUS: Active in Production // Zero critical vulnerabilities."
      ],
      projects: () => [
        "[01] AUTONOMOUS AGENT SWARM        -> Dynamic multi-agent consensus [VERIFIED]",
        "[02] NEURAL RAYMARCHING ENGINE      -> 60 FPS volumetric WebGL shaders [DEPLOYED]",
        "[03] 10-TIER VECTOR KNOWLEDGE GRAPH -> Temporal KG with Ebbinghaus memory retention",
        "[04] QUANTUM NEURAL PROCESSOR       -> Photonic tensor core architecture [ACTIVE]",
        "[05] SPATIAL DRONE PERCEPTION       -> Real-time LiDAR SLAM & autonomous telemetry"
      ],
      skills: () => [
        "CORE COMPETENCIES:",
        "  - Autonomous Agent Orchestration: [██████████████████] 98%",
        "  - WebGL / 3D Spatial Graphics:    [█████████████████ ] 95%",
        "  - Distributed Vector Systems:     [████████████████  ] 92%",
        "  - Benchmark Integrity Validation: [██████████████████] 99%",
        "  - Systems Architecture (Rust/Go): [███████████████   ] 88%"
      ],
      eval: () => [
        "RUNNING BENCHMARK INTEGRITY VERIFICATION SUITE...",
        "  [✓] schema_validator: Pass (Manifest ingested)",
        "  [✓] contamination_quarantine: 0 leaked answers detected",
        "  [✓] official_evaluator_parity: Numerator/Denominator confirmed (41/41)",
        "  [✓] latency_accuracy_tradeoff: Validated (No shortcuts)",
        "SYSTEM HEALTH VERDICT: [VERIFIED 100% AUDIT PASS]"
      ],
      stats: () => [
        `AGENT UPTIME: ${Math.floor(performance.now() / 1000)} seconds`,
        "MEMORY RESIDENT SET: 38.4 MB",
        "GPU DRAW CALLS: 1 per frame (Optimized Spatial Batch)",
        "QUANTUM ENTROPY: 0.00012 (Nominal)"
      ],
      contact: () => [
        "COMMUNICATION ENDPOINTS:",
        "  - Neural Link: contact@abhishek-agi.dev",
        "  - Codebase: github.com/abhishek-agi",
        "  - Transmission Protocol: WSS/TLS 1.3 Holographic Uplink"
      ],
      matrix: () => {
        this.runMatrixGlyphStream();
        return ["INITIATING NEURAL MATRIX GLYPH STREAM..."];
      },
      audio: () => {
        const state = audio.toggle();
        return [`SPATIAL AUDIO FEEDBACK: [${state ? 'ENABLED' : 'MUTED'}]`];
      },
      clear: () => {
        this.body.innerHTML = '';
        return [];
      }
    };

    this.bindEvents();
  }

  bindEvents() {
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = this.input.value.trim().toLowerCase();
        if (!cmd) return;
        this.executeCommand(cmd);
        this.input.value = '';
        audio.playBlip(1100, 0.04, 'square');
      }
    });
  }

  executeCommand(cmd) {
    this.appendLine(`user@terminal:~$ ${cmd}`, 'cyan');

    if (this.commands[cmd]) {
      const output = this.commands[cmd]();
      output.forEach(line => {
        this.appendLine(line, line.includes('[✓]') || line.includes('VERIFIED') ? 'success' : 'sys');
      });
    } else {
      this.appendLine(`bash: command not found: ${cmd}. Type 'help' for available commands.`, 'text-rose');
    }

    this.body.scrollTop = this.body.scrollHeight;
  }

  appendLine(text, className = '') {
    const p = document.createElement('div');
    p.className = `terminal-line ${className}`;
    p.textContent = text;
    this.body.appendChild(p);
  }

  runMatrixGlyphStream() {
    let count = 0;
    const interval = setInterval(() => {
      const glyphs = Array.from({ length: 32 }, () => String.fromCharCode(0x30A0 + Math.random() * 96)).join(' ');
      this.appendLine(glyphs, 'success');
      this.body.scrollTop = this.body.scrollHeight;
      count++;
      if (count > 6) clearInterval(interval);
    }, 120);
  }
}

// ==========================================
// 6. PROJECT MODAL INSPECTOR
// ==========================================
class ProjectModalInspector {
  constructor() {
    this.overlay = document.getElementById('project-modal');
    this.modalContent = document.getElementById('modal-dynamic-content');
    this.closeBtn = document.getElementById('modal-close');

    this.projectData = {
      swarm: {
        title: "Autonomous Agent Swarm & Self-Healing Consensus",
        category: "DISTRIBUTED MULTI-AGENT ARCHITECTURE",
        desc: "A fault-tolerant swarm coordination runtime designed for zero-latency task dispatch, cross-agent verification, and deterministic execution rollback under Byzantine failure modes.",
        specs: [
          { label: "Swarm Nodes", value: "24 Concurrent Agents" },
          { label: "Consensus Latency", value: "< 14ms Median" },
          { label: "Failure Recovery", value: "Automatic Sub-100ms Re-route" },
          { label: "Verification Score", value: "99.98% Protocol Parity" }
        ],
        tags: ["Distributed Consensus", "Rust", "WebSockets", "Raft Protocol"]
      },
      raymarch: {
        title: "Neural Raymarching Volumetric Renderer",
        category: "REAL-TIME GRAPHICS & SPATIAL SHADERS",
        desc: "Custom WebGL raymarching engine rendering signed distance fields (SDF) and volumetric radiance fields with 60 FPS performance on consumer silicon.",
        specs: [
          { label: "Raymarch Steps", value: "128 Samples/Pixel" },
          { label: "Frame Budget", value: "16.6ms Target (60 FPS)" },
          { label: "Shading Model", value: "Analytical Phong & Soft Shadows" },
          { label: "Memory Footprint", value: "12 MB VRAM Buffer" }
        ],
        tags: ["WebGL", "GLSL Shaders", "Raymarching", "SDF Math"]
      },
      graph: {
        title: "10-Tier Temporal Vector Knowledge Graph",
        category: "KNOWLEDGE RETRIEVAL & VECTOR PERSISTENCE",
        desc: "Hierarchical episodic memory architecture implementing Ebbinghaus decay formulas and temporal link graphs to prevent context saturation in long-running agent threads.",
        specs: [
          { label: "Memory Tiers", value: "10 Distinct Recall Layers" },
          { label: "Vector Search", value: "HNSW Indexed (M=16, ef=64)" },
          { label: "Decay Protocol", value: "Temporal Half-life Modeling" },
          { label: "Query Throughput", value: "12,400 QPS" }
        ],
        tags: ["Vector Embeddings", "HNSW", "Temporal Graphs", "Information Retrieval"]
      },
      quantum: {
        title: "Quantum Photonic Tensor Core Accelerator",
        category: "HARDWARE-AWARE QUANTUM SIMULATION",
        desc: "State-of-the-art quantum circuit simulation calculating Bloch sphere state rotations and density matrices with GPU tensor core parallelism.",
        specs: [
          { label: "Qubit Simulation", value: "36 State Qubits" },
          { label: "Entanglement Metric", value: "0.9987 State Fidelity" },
          { label: "Gate Speed", value: "1.2 ns Synthesized" },
          { label: "Hardware Target", value: "Optical Matrix Photonic Chips" }
        ],
        tags: ["Quantum Gates", "Bloch Vectors", "Tensor Processing", "Python/C++"]
      },
      spatial: {
        title: "Autonomous Drone LiDAR SLAM & Telemetry",
        category: "AUTONOMOUS VEHICLES & EMBEDDED PERCEPTION",
        desc: "Dense 3D point cloud feature extraction and real-time LiDAR Odometry and Mapping (LOAM) for sub-centimeter autonomous spatial navigation in GPS-denied environments.",
        specs: [
          { label: "Point Density", value: "300,000 Points/sec" },
          { label: "Position Drift", value: "< 0.05% Over 5km Path" },
          { label: "Sensor Array", value: "Solid-state 64-beam LiDAR + IMU" },
          { label: "Inference Latency", value: "8.2ms Pipeline" }
        ],
        tags: ["LiDAR SLAM", "Computer Vision", "Point Clouds", "ROS 2"]
      }
    };

    this.bindEvents();
  }

  bindEvents() {
    document.querySelectorAll('[data-inspect-project]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-inspect-project');
        this.openModal(id);
        audio.playUplink();
      });
    });

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeModal());
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.closeModal();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  openModal(id) {
    const data = this.projectData[id] || this.projectData.swarm;
    this.modalContent.innerHTML = `
      <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--accent-cyan); margin-bottom: 0.5rem; letter-spacing: 2px;">
        // ARCHITECTURE SPECIFICATION
      </div>
      <h2 style="font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 0.4rem;">${data.title}</h2>
      <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--accent-purple); margin-bottom: 1.5rem;">
        ${data.category}
      </div>
      <p style="color: var(--text-muted); line-height: 1.7; font-size: 0.95rem; margin-bottom: 2rem;">
        ${data.desc}
      </p>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 2rem;">
        ${data.specs.map(s => `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); padding: 1rem; border-radius: 8px;">
            <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">${s.label}</div>
            <div style="font-family: var(--font-mono); font-size: 1.1rem; font-weight: 700; color: #fff; margin-top: 0.3rem;">${s.value}</div>
          </div>
        `).join('')}
      </div>

      <div style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
        ${data.tags.map(t => `
          <span style="font-family: var(--font-mono); font-size: 0.75rem; background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.25); color: var(--accent-cyan); padding: 4px 10px; border-radius: 4px;">
            #${t}
          </span>
        `).join('')}
      </div>
    `;

    this.overlay.classList.add('active');
  }

  closeModal() {
    this.overlay.classList.remove('active');
    audio.playBlip(500, 0.05, 'sine');
  }
}

// ==========================================
// 7. TOAST NOTIFICATIONS & TRANSMISSION FORM
// ==========================================
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-box';
  toast.innerHTML = `
    <span style="color: var(--accent-cyan); font-size: 1.1rem;">⚡</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  audio.playBlip(1400, 0.06, 'triangle');

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = 'TRANSMITTING NEURAL PACKET...';
    audio.playUplink();

    setTimeout(() => {
      form.reset();
      btn.disabled = false;
      btn.innerHTML = originalText;
      showToast("Transmission dispatched to neural gateway [ACK 200 OK]");
    }, 1200);
  });
}

// ==========================================
// 8. HUD & WAYPOINT SCROLL TRACKER
// ==========================================
function initScrollAndHUD() {
  const bar = document.querySelector('.scroll-progress-bar');
  const sections = document.querySelectorAll('section[id]');
  const waypoints = document.querySelectorAll('.waypoint-dot');

  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const progress = total > 0 ? (window.scrollY / total) * 100 : 0;
    if (bar) bar.style.width = `${progress}%`;

    // Active Section Detection
    let currentId = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 200;
      if (window.scrollY >= top) {
        currentId = sec.getAttribute('id');
      }
    });

    waypoints.forEach(wp => {
      if (wp.getAttribute('data-target') === currentId) {
        wp.classList.add('active');
      } else {
        wp.classList.remove('active');
      }
    });
  }, { passive: true });

  waypoints.forEach(wp => {
    wp.addEventListener('click', () => {
      const targetId = wp.getAttribute('data-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
        audio.playBlip(800, 0.04, 'sine');
      }
    });
  });

  // Audio Toggle Button in HUD
  const audioBtn = document.getElementById('hud-audio-toggle');
  if (audioBtn) {
    audioBtn.addEventListener('click', () => {
      const enabled = audio.toggle();
      audioBtn.innerHTML = enabled ? '🔊 AUDIO: ON' : '🔇 AUDIO: OFF';
      audioBtn.style.color = enabled ? 'var(--accent-cyan)' : 'var(--text-dim)';
      showToast(`Audio feedback ${enabled ? 'activated' : 'muted'}`);
    });
  }
}

// ==========================================
// 9. CUSTOM CYBER CURSOR
// ==========================================
function initCustomCursor() {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mouseX = 0, mouseY = 0;
  let ringX = 0, ringY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
  });

  function renderRing() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(renderRing);
  }
  renderRing();

  document.querySelectorAll('a, button, .channel-pill, .glass-panel, .project-card').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('active'));
    el.addEventListener('mouseleave', () => ring.classList.remove('active'));
  });
}

// ==========================================
// MAIN INITIALIZATION
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  // 1. 3D Spatial Canvas Warp Engine
  window.spatialEngine = new SpatialWarpEngine('webgl-canvas');

  // 2. Interactive 3D Card Tilt
  window.tiltEngine = new CardTiltEngine();

  // 3. Procedural 3D Video Showreel
  window.showreelEngine = new ProceduralShowreelEngine('showreel-canvas');

  // 4. Interactive Project Media from mock-media.js
  if (window.mockMediaEngine) {
    window.mockMediaEngine.init();
  }

  // 5. Interactive Terminal REPL
  window.terminalREPL = new CyberTerminalREPL();

  // 6. Project Modal Inspector
  window.modalInspector = new ProjectModalInspector();

  // 7. Contact Form & Toast
  initContactForm();

  // 8. Scroll & HUD Navigation
  initScrollAndHUD();

  // 9. Custom Cursor
  initCustomCursor();
});
