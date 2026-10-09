# 3D Cybernetic Portfolio // Abhishek

An ultra-modern, interactive 3D animated scrolling portfolio website engineered with **WebGL**, **HTML5 3D Spatial Canvas**, **CSS 3D Transforms**, and the **Web Audio API**.

---

## 🌟 Key Architecture & Features

1. **3D Spatial Canvas Warp Engine (`app.js`)**:
   - Fixed background canvas rendering a 3D perspective particle starfield with depth warping, high-speed motion streak blur during rapid scroll, and a receding 3D horizon grid.
   - Real-time 4D hypercube / tesseract projection rotating smoothly across coordinate planes and reacting to mouse parallax.
   - Zero external library dependencies — 100% native standard mathematics running at locked 60 FPS.

2. **Interactive 3D Video Showreel Holodeck (`#showreel`)**:
   - Custom procedural cinematic canvas video stream with 4 switchable multimodal channels:
     - **01. NEURAL CORE**: Synaptic pulse networks with real-time loss curve telemetry.
     - **02. SPATIAL SLAM**: Concentric LiDAR radar scanning with autonomous bounding box tracking.
     - **03. QUANTUM BLOCH**: 3D Bloch sphere vector rotation and entanglement fidelity metrics.
     - **04. MATRIX STREAM**: Cyber glyph disassembly stream with AST compiler parsing.
   - Interactive playback controls: Play/Pause toggle, Fullscreen mode, live timecode counter, and audio frequency equalizer bars.

3. **3D Interactive Card Tilt & Lighting**:
   - Mouse-tracking perspective tilts (`perspective(1000px) rotateX(...) rotateY(...) scale3d(...)`) applied across all glass cards, avatars, and showreel frames.
   - Dynamic radial specular highlight tracking cursor position (`--mouse-x`, `--mouse-y`).

4. **Flagship Projects Showcase (`#projects`)**:
   - **Autonomous Agent Swarm**: Real-time canvas swarm particle simulation (`canvas-swarm`).
   - **Neural Raymarcher Engine**: Real-time volumetric procedural shader wave canvas (`canvas-raymarch`).
   - **10-Tier Vector Knowledge Graph**: Live graph network telemetry with traveling packets (`canvas-graph`).
   - **Quantum Photonic Neural Core**: AI-generated cinematic visual asset (`assets/project-quantum.jpg`).
   - **Spatial Perception & Drone SLAM**: AI-generated LiDAR spatial perception asset (`assets/project-spatial.jpg`).
   - **Deep-Dive Architecture Modal**: Detailed technical specifications, benchmark metrics, and architecture specs on demand.

5. **Interactive Hacker Terminal REPL (`#terminal`)**:
   - Live command-line interface supporting:
     - `help`: Directory of available commands.
     - `about`: Architect biography, core philosophies, and research focus.
     - `projects`: Detailed list of deployed codebases and status.
     - `skills`: Radar competency overview.
     - `eval`: Runs synthetic AGI benchmark integrity audit.
     - `matrix`: Streams real-time cybernetic glyph rain in the terminal.
     - `stats`: System memory, uptime, and quantum entropy.
     - `audio`: Toggles spatial Web Audio synth feedback.
     - `clear`: Screen wipe.

6. **Procedural Web Audio Synthesizer**:
   - Uses the native Web Audio API oscillators to generate futuristic sound effects (hover blips, click chirps, uplink transmissions) without downloading external audio files.

---

## 🚀 How to Launch

### Option A: Direct Browser Launch
Open [`portfolio/index.html`](file:///c:/Users/abhis/Downloads/pt/portfolio/index.html) directly in any modern web browser (Chrome, Edge, Firefox, Brave, Safari).

### Option B: Local HTTP Server
Run with Python:
```bash
python -m http.server 8000 --directory portfolio
```
Navigate to: `http://localhost:8000`

### Option C: In-Chat Artifact Preview
Preview the standalone artifact file:
[`portfolio_3d.html`](file:///C:/Users/abhis/.gemini/antigravity/brain/6a116ab4-3bfa-4f27-a260-9f8fd0f5df39/portfolio_3d.html)
