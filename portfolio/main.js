/**
 * portfolio/main.js
 * AGI 0.7 Frontier 3D Animated Scrolling Portfolio
 * Powered by Three.js WebGL & Procedural Web Audio API
 */

(function () {
  "use strict";

  // ============================================================================
  // Audio Synthesizer (Procedural Web Audio API - Zero external files)
  // ============================================================================
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.enabled = false;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    toggle() {
      this.init();
      this.enabled = !this.enabled;
      return this.enabled;
    }

    playTone(freq, type = "sine", duration = 0.08, gainVal = 0.05) {
      if (!this.enabled || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        // Audio error suppression
      }
    }

    hover() {
      this.playTone(880, "sine", 0.04, 0.02);
    }

    click() {
      this.playTone(520, "triangle", 0.08, 0.06);
    }

    terminalKey() {
      this.playTone(1200 + (Math.random() - 0.5) * 300, "square", 0.02, 0.015);
    }
  }

  const sfx = new SoundFX();

  // ============================================================================
  // Three.js 3D Scene Controller
  // ============================================================================
  let scene, camera, renderer;
  let particlesMesh;
  let heroGroup, aboutGroup, projectsGroup, skillsGroup, contactGroup;
  let heroCoreMesh, heroInnerSphere, ringA, ringB;
  let torusKnotMesh, neuralNodesMesh, neuralLinesMesh;
  let projectPlanes = [];
  let skillsRingGroup;
  let contactPortalMesh;

  let currentScroll = 0;
  let targetScroll = 0;
  let scrollProgress = 0;

  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  function initThree() {
    const canvas = document.getElementById("webgl-canvas");
    if (!canvas) return;

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 7);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x00f0ff, 2.5, 30);
    cyanLight.position.set(5, 5, 5);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 2.5, 30);
    purpleLight.position.set(-5, -5, 5);
    scene.add(purpleLight);

    // Build 3D Scenery
    createParticlesGalaxy();
    createHeroScene();
    createAboutScene();
    createProjectsScene();
    createSkillsScene();
    createContactScene();

    window.addEventListener("resize", onWindowResize);
    window.addEventListener("scroll", onScroll);
    window.addEventListener("mousemove", onMouseMove);

    // Kickoff render loop
    animate();
  }

  // 1. Cosmic Particles Starfield
  function createParticlesGalaxy() {
    const count = 2200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorCyan = new THREE.Color(0x00f0ff);
    const colorPurple = new THREE.Color(0xa855f7);
    const colorWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 65 - 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;

      // Color distribution
      const mixed = Math.random();
      const col = mixed < 0.4 ? colorCyan : mixed < 0.8 ? colorPurple : colorWhite;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    particlesMesh = new THREE.Points(geometry, material);
    scene.add(particlesMesh);
  }

  // 2. Hero 3D Object: Quantum Gyroscope Core
  function createHeroScene() {
    heroGroup = new THREE.Group();
    heroGroup.position.set(2.2, 0, 0);

    // Outer Geodesic Icosahedron Wireframe
    const icoGeo = new THREE.IcosahedronGeometry(1.6, 2);
    const icoMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      roughness: 0.2
    });
    heroCoreMesh = new THREE.Mesh(icoGeo, icoMat);
    heroGroup.add(heroCoreMesh);

    // Inner Glowing Core Sphere
    const sphereGeo = new THREE.SphereGeometry(0.85, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0x070b16,
      emissive: 0xa855f7,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.8
    });
    heroInnerSphere = new THREE.Mesh(sphereGeo, sphereMat);
    heroGroup.add(heroInnerSphere);

    // Orbital Gimbal Rings
    const ringGeoA = new THREE.TorusGeometry(2.1, 0.025, 16, 100);
    const ringMatA = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.7 });
    ringA = new THREE.Mesh(ringGeoA, ringMatA);
    heroGroup.add(ringA);

    const ringGeoB = new THREE.TorusGeometry(2.35, 0.02, 16, 100);
    const ringMatB = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.7 });
    ringB = new THREE.Mesh(ringGeoB, ringMatB);
    ringB.rotation.x = Math.PI * 0.4;
    heroGroup.add(ringB);

    scene.add(heroGroup);
  }

  // 3. About Scene: Neural Torus Knot & Constellation
  function createAboutScene() {
    aboutGroup = new THREE.Group();
    aboutGroup.position.set(-2.5, -9, 0);

    const knotGeo = new THREE.TorusKnotGeometry(1.4, 0.35, 128, 32, 2, 3);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x111c38,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.7,
      wireframe: true
    });
    torusKnotMesh = new THREE.Mesh(knotGeo, knotMat);
    aboutGroup.add(torusKnotMesh);

    // Surrounding Neural Constellation Nodes
    const nodeCount = 35;
    const nodeGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    
    neuralNodesMesh = new THREE.Group();
    const nodePositions = [];
    for (let i = 0; i < nodeCount; i++) {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;
      const radius = 2.4 + Math.random() * 1.2;
      node.position.set(
        radius * Math.cos(phi) * Math.sin(theta),
        radius * Math.sin(phi),
        radius * Math.cos(phi) * Math.cos(theta)
      );
      nodePositions.push(node.position);
      neuralNodesMesh.add(node);
    }
    aboutGroup.add(neuralNodesMesh);

    scene.add(aboutGroup);
  }

  // 4. Projects Scene: Floating 3D Holographic Monoliths
  function createProjectsScene() {
    projectsGroup = new THREE.Group();
    projectsGroup.position.set(0, -18, 0);

    const positions = [
      { x: -3.2, y: 0, z: 0.5, color: 0x00f0ff },
      { x: 0, y: 0, z: 0, color: 0xa855f7 },
      { x: 3.2, y: 0, z: -0.5, color: 0x10b981 }
    ];

    positions.forEach((pos, idx) => {
      const monolithGroup = new THREE.Group();
      monolithGroup.position.set(pos.x, pos.y, pos.z);

      // Glass Plane
      const planeGeo = new THREE.BoxGeometry(2.2, 2.8, 0.1);
      const planeMat = new THREE.MeshStandardMaterial({
        color: 0x0a1224,
        emissive: pos.color,
        emissiveIntensity: 0.18,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.75
      });
      const monolith = new THREE.Mesh(planeGeo, planeMat);
      monolithGroup.add(monolith);

      // Wireframe Outline Frame
      const frameGeo = new THREE.BoxGeometry(2.25, 2.85, 0.12);
      const frameMat = new THREE.MeshBasicMaterial({ color: pos.color, wireframe: true, transparent: true, opacity: 0.5 });
      const frame = new THREE.Mesh(frameGeo, frameMat);
      monolithGroup.add(frame);

      projectsGroup.add(monolithGroup);
      projectPlanes.push(monolithGroup);
    });

    scene.add(projectsGroup);
  }

  // 5. Skills Scene: Cybernetic Ring of Floating Octahedrons
  function createSkillsScene() {
    skillsGroup = new THREE.Group();
    skillsGroup.position.set(0, -27, 0);

    skillsRingGroup = new THREE.Group();
    const ringCount = 12;
    const radius = 3.2;

    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2;
      const geo = new THREE.OctahedronGeometry(0.35);
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x00f0ff : 0xa855f7,
        wireframe: true,
        emissive: i % 2 === 0 ? 0x00f0ff : 0xa855f7,
        emissiveIntensity: 0.4
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      skillsRingGroup.add(mesh);
    }
    skillsGroup.add(skillsRingGroup);
    scene.add(skillsGroup);
  }

  // 6. Contact Scene: Holographic Wormhole Portal
  function createContactScene() {
    contactGroup = new THREE.Group();
    contactGroup.position.set(0, -38, 0);

    const portalGeo = new THREE.TorusGeometry(2.8, 0.12, 16, 80);
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true
    });
    contactPortalMesh = new THREE.Mesh(portalGeo, portalMat);
    contactGroup.add(contactPortalMesh);

    // Inner Spiral
    const spiralGeo = new THREE.TorusGeometry(1.9, 0.08, 16, 60);
    const spiralMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true
    });
    const spiral = new THREE.Mesh(spiralGeo, spiralMat);
    spiral.rotation.x = 0.5;
    contactGroup.add(spiral);

    scene.add(contactGroup);
  }

  // ============================================================================
  // Event Handlers & Smooth Interpolation
  // ============================================================================
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onScroll() {
    const scrollMax = document.documentElement.scrollHeight - window.innerHeight;
    targetScroll = window.scrollY;
    scrollProgress = scrollMax > 0 ? targetScroll / scrollMax : 0;

    // Update Progress Bar
    const progBar = document.querySelector(".scroll-progress-bar");
    if (progBar) {
      progBar.style.width = `${scrollProgress * 100}%`;
    }

    // Update Waypoint Active State
    const waypoints = document.querySelectorAll(".waypoint-dot");
    const sectionIndex = Math.min(Math.floor(scrollProgress * 6), 5);
    waypoints.forEach((wp, idx) => {
      wp.classList.toggle("active", idx === sectionIndex);
    });
  }

  function onMouseMove(e) {
    targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;

    // Custom Cursor Tracker
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    if (dot && ring) {
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
    }

    // Dynamic Glass Panel Spotlight
    const panels = document.querySelectorAll(".glass-panel");
    panels.forEach(p => {
      const rect = p.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      p.style.setProperty("--mouse-x", `${x}%`);
      p.style.setProperty("--mouse-y", `${y}%`);
    });
  }

  // Camera Spline Path Coordinates along Scroll Height
  function updateCameraPath(progress) {
    // 6 Sections Keyframes: Hero, About, Projects, Capabilities, Terminal, Contact
    // Section heights mapped to 0.0 -> 1.0 progress
    const scrollYMapped = -progress * 38;

    // Camera lateral sway & depth
    const lateralX = Math.sin(progress * Math.PI * 3) * 1.8;
    const depthZ = 7 + Math.sin(progress * Math.PI * 4) * 1.2;

    camera.position.x += (lateralX - camera.position.x) * 0.06;
    camera.position.y += (scrollYMapped - camera.position.y) * 0.06;
    camera.position.z += (depthZ - camera.position.z) * 0.06;

    // Look at target point with subtle parallax
    const targetY = scrollYMapped;
    const targetX = targetMouseX * 0.4;
    camera.lookAt(targetX, targetY, 0);
  }

  // ============================================================================
  // Animation Loop (60 FPS WebGL)
  // ============================================================================
  function animate() {
    requestAnimationFrame(animate);

    // Smooth Lerp Mouse
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    // Smooth Lerp Scroll
    currentScroll += (targetScroll - currentScroll) * 0.08;

    // Update 3D Camera
    updateCameraPath(scrollProgress);

    // Rotate Hero 3D Gyroscope
    if (heroCoreMesh) {
      heroCoreMesh.rotation.x += 0.005;
      heroCoreMesh.rotation.y += 0.008;
    }
    if (heroInnerSphere) {
      const scale = 0.85 + Math.sin(Date.now() * 0.003) * 0.06;
      heroInnerSphere.scale.set(scale, scale, scale);
    }
    if (ringA) ringA.rotation.z += 0.012;
    if (ringB) ringB.rotation.y += 0.009;

    // Rotate About 3D Torus Knot & Constellation
    if (torusKnotMesh) {
      torusKnotMesh.rotation.x += 0.006;
      torusKnotMesh.rotation.y += 0.009;
    }
    if (neuralNodesMesh) {
      neuralNodesMesh.rotation.y += 0.003;
    }

    // Projects Monoliths Floating Parallax
    projectPlanes.forEach((plane, idx) => {
      const wave = Math.sin(Date.now() * 0.002 + idx * 1.5) * 0.15;
      plane.position.y = wave;
      plane.rotation.y = mouseX * 0.2 + (idx - 1) * 0.15;
      plane.rotation.x = -mouseY * 0.15;
    });

    // Skills Cybernetic Ring
    if (skillsRingGroup) {
      skillsRingGroup.rotation.z += 0.008;
      skillsRingGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;
    }

    // Contact Portal Rotation
    if (contactPortalMesh) {
      contactPortalMesh.rotation.z += 0.015;
    }

    // Particle field slow drift
    if (particlesMesh) {
      particlesMesh.rotation.y = Date.now() * 0.0001;
    }

    renderer.render(scene, camera);
  }

  // ============================================================================
  // Interactive Terminal REPL Engine
  // ============================================================================
  function initTerminal() {
    const input = document.getElementById("terminal-cmd-input");
    const output = document.getElementById("terminal-output");
    if (!input || !output) return;

    const commands = {
      help: () => [
        "AVAILABLE SYSTEM COMMANDS:",
        "  ▹ about      : Display architecture philosophy & role",
        "  ▹ projects   : List flagship 3D & AI systems",
        "  ▹ skills     : Print verified capability matrix",
        "  ▹ metrics    : Show model alignment and latency benchmarks",
        "  ▹ contact    : Open secure transmission link",
        "  ▹ sound      : Toggle audio synthesizer state",
        "  ▹ clear      : Clear terminal buffer"
      ],
      about: () => [
        "ALEX RIVERA // FRONTIER AI & 3D SYSTEMS ARCHITECT",
        "Specializing in autonomous multi-agent swarms, WebGL/WebGPU spatial compute,",
        "and formally verified neural architectures. Pushing the boundary of computer-use agents."
      ],
      projects: () => [
        "FLAGSHIP ARTIFACTS:",
        "  [1] Project Chronos : Multi-Agent Autonomous Simulation Engine (tau-bench 100%)",
        "  [2] HyperDrive     : Spatial Neural Raymarching Volumetric WebGL Shaders",
        "  [3] OmniMind       : 10-Tier Memory Subsystem & Semantic Knowledge Graph"
      ],
      skills: () => [
        "VERIFIED CAPABILITIES:",
        "  • 3D Graphics & Compute : Three.js, WebGL2, WebGPU, GLSL Shaders, Blender (96%)",
        "  • AI & Autonomous Swarms : Gemini Flash/Pro, Tool Calling, Multi-Agent DAGs (98%)",
        "  • Systems & Security    : TypeScript, Python, OWASP MCP Sandbox Containment (94%)",
        "  • Frontend Engineering  : Modern ES6+, Canvas API, Responsive Architecture (95%)"
      ],
      metrics: () => [
        "LIVE TELEMETRY BENCHMARKS:",
        "  • Decision-to-Action Latency : 42ms",
        "  • Agent Tool Accuracy        : 99.4%",
        "  • Zero-Day Security Leaks    : 0 across all tested vectors",
        "  • Verified Regression Guards : 10/10 active"
      ],
      contact: () => {
        document.getElementById("contact").scrollIntoView({ behavior: "smooth" });
        return ["Rerouting viewport to secure communication node..."];
      },
      sound: () => {
        const state = sfx.toggle();
        const soundBtn = document.getElementById("sound-toggle-btn");
        if (soundBtn) {
          soundBtn.innerHTML = state ? "🔊 AUDIO: ON" : "🔇 AUDIO: OFF";
        }
        return [state ? "Audio synthesizer INITIALIZED (Procedural Web Audio API active)." : "Audio synthesizer MUTED."];
      },
      clear: () => {
        output.innerHTML = "";
        return [];
      }
    };

    function appendLine(text, className = "") {
      const line = document.createElement("div");
      line.className = `terminal-line ${className}`;
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    input.addEventListener("keydown", (e) => {
      sfx.terminalKey();
      if (e.key === "Enter") {
        const cmd = input.value.trim().toLowerCase();
        if (!cmd) return;

        appendLine(`visitor@neural-hub:~$ ${cmd}`, "cyan");
        input.value = "";

        if (commands[cmd]) {
          const res = commands[cmd]();
          res.forEach(line => appendLine(line, ""));
        } else {
          appendLine(`command not recognized: '${cmd}'. Type 'help' for available directives.`, "sys");
        }
        sfx.click();
      }
    });
  }

  // ============================================================================
  // Project Inspection Modal Controller
  // ============================================================================
  function initProjectModal() {
    const modal = document.getElementById("project-modal");
    const closeBtn = document.getElementById("modal-close");
    const titleEl = document.getElementById("modal-title");
    const descEl = document.getElementById("modal-desc");
    const tagsEl = document.getElementById("modal-tags");
    const codeEl = document.getElementById("modal-code");

    const projectData = {
      chronos: {
        title: "Project Chronos // Autonomous Swarm Engine",
        desc: "A distributed orchestration runtime coordinating concurrent LLM subagents through state machines, persistent disk-hydrated task queues, and cryptographic Merkle audit logs.",
        tags: ["Multi-Agent FSM", "Gemini 3.8 Flash High", "OWASP MCP Gateway", "Zero-Data-Loss"],
        code: `// Chronos Agent State Transition Guard
const orchestrator = new MasterOrchestrator({
  foundationModel: "gemini-3.8-flash-high",
  maxSubagents: 16,
  deadlockWatchdogMs: 45000,
  sandboxTier: "CLOSED_WORLD"
});
await orchestrator.dispatchGoal("SOLVE_TASK_GRAPH");`
      },
      hyperdrive: {
        title: "HyperDrive // Neural Raymarching Engine",
        desc: "Real-time volumetric shader engine running directly in the browser via WebGL and WebGPU. Generates procedural fractal clouds, dynamic light scattering, and terrain deformations at 60 FPS.",
        tags: ["GLSL Shaders", "Raymarching", "Volumetric Fog", "WebGPU Compute"],
        code: `// Volumetric Raymarch Loop (Fragment Shader)
vec4 raymarch(vec3 ro, vec3 rd) {
  float depth = 0.0;
  for (int i = 0; i < 128; i++) {
    vec3 p = ro + rd * depth;
    float d = sdfNebula(p);
    if (d < 0.001) return shadePlasma(p);
    depth += max(d * 0.8, 0.02);
  }
  return vec4(0.0);
}`
      },
      omnimind: {
        title: "OmniMind // 10-Tier Memory Subsystem",
        desc: "Hierarchical memory architecture balancing Working, Semantic, Episodic, Procedural, and Security memory tiers with Ebbinghaus exponential decay and vector retrieval.",
        tags: ["10-Tier Memory", "Ebbinghaus Decay", "Triple-Scoring", "JSON-L Ledger"],
        code: `// Multi-Tier Memory Retrieval with Decay
const memory = new TenTierMemoryStore();
const results = memory.retrieveScoredQuery({
  query: "user authentication protocol",
  decayHalfLifeHours: 72,
  minRelevanceScore: 0.84
});`
      }
    };

    document.querySelectorAll(".inspect-proj-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const pKey = btn.getAttribute("data-project");
        const data = projectData[pKey];
        if (!data || !modal) return;

        titleEl.textContent = data.title;
        descEl.textContent = data.desc;
        tagsEl.innerHTML = data.tags.map(t => `<span class="proj-tag">${t}</span>`).join("");
        codeEl.textContent = data.code;

        modal.classList.add("active");
        sfx.click();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.classList.remove("active");
        sfx.click();
      });
    }

    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.remove("active");
          sfx.click();
        }
      });
    }
  }

  // ============================================================================
  // Interactive UI Bindings (Sound, Contact Form, Waypoints)
  // ============================================================================
  function initUI() {
    // Sound Button
    const soundBtn = document.getElementById("sound-toggle-btn");
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        const state = sfx.toggle();
        soundBtn.innerHTML = state ? "🔊 AUDIO: ON" : "🔇 AUDIO: OFF";
      });
    }

    // Audio hover effects on clickable buttons
    document.querySelectorAll("button, a, .waypoint-dot, .glass-panel").forEach(el => {
      el.addEventListener("mouseenter", () => sfx.hover());
    });

    // Waypoint dots navigation
    document.querySelectorAll(".waypoint-dot").forEach(dot => {
      dot.addEventListener("click", () => {
        const targetId = dot.getAttribute("data-target");
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth" });
          sfx.click();
        }
      });
    });

    // Contact Form Submission Simulation
    const contactForm = document.getElementById("contact-form");
    const statusMsg = document.getElementById("contact-status");
    if (contactForm && statusMsg) {
      contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        sfx.click();

        statusMsg.style.display = "block";
        statusMsg.className = "terminal-line cyan";
        statusMsg.textContent = "TRANSMITTING DATA PACKET VIA SECURE GATEWAY...";

        setTimeout(() => {
          statusMsg.className = "terminal-line success";
          statusMsg.textContent = "✔ TRANSMISSION CONFIRMED: Message received by Neural Hub. Link established.";
          contactForm.reset();
        }, 1200);
      });
    }
  }

  // ============================================================================
  // Initialization Lifecycle
  // ============================================================================
  window.addEventListener("DOMContentLoaded", () => {
    initThree();
    initTerminal();
    initProjectModal();
    initUI();

    // Start procedural canvas animations
    if (window.mockMediaEngine) {
      window.mockMediaEngine.init();
    }
  });
})();
