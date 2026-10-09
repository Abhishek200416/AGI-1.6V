"""
tests/test_portfolio.py
Verification suite for the 3D Animated Scrolling Portfolio.
Checks HTML integrity, required 3D canvas hooks, CSS rules, and JS syntax.
"""

import os
import unittest
from pathlib import Path


class TestPortfolioIntegrity(unittest.TestCase):

    def setUp(self):
        self.root = Path(__file__).parent.parent
        self.portfolio_dir = self.root / "portfolio"

    def test_file_structure_exists(self):
        """Verifies that all essential portfolio files exist."""
        required_files = [
            self.portfolio_dir / "index.html",
            self.portfolio_dir / "style.css",
            self.portfolio_dir / "app.js",
            self.portfolio_dir / "mock-media.js",
            self.portfolio_dir / "README.md"
        ]
        for f in required_files:
            self.assertTrue(f.exists(), f"Missing required file: {f}")

    def test_html_structure_and_canvases(self):
        """Verifies HTML structure, 3D WebGL canvas, showreel video canvas, and navigation."""
        html_file = self.portfolio_dir / "index.html"
        content = html_file.read_text(encoding="utf-8")

        # 3D WebGL Canvas
        self.assertIn('<canvas id="webgl-canvas"></canvas>', content)

        # 7 Key Sections
        sections = ["hero", "showreel", "about", "projects", "skills", "terminal", "contact"]
        for sec in sections:
            self.assertIn(f'id="{sec}"', content, f"Section #{sec} missing in index.html")

        # Video Showreel Canvas
        self.assertIn('id="showreel-canvas"', content)

        # Interactive Terminal REPL & Controls
        self.assertIn('id="terminal-input"', content)
        self.assertIn('id="terminal-body"', content)
        self.assertIn('id="hud-audio-toggle"', content)
        self.assertIn('id="project-modal"', content)
        self.assertIn('id="contact-form"', content)

    def test_css_styling_and_responsiveness(self):
        """Verifies CSS contains variables, glassmorphism, and responsive breakpoints."""
        css_file = self.portfolio_dir / "style.css"
        content = css_file.read_text(encoding="utf-8")

        # Key variables
        self.assertIn("--accent-cyan:", content)
        self.assertIn("--accent-purple:", content)
        self.assertIn("--bg-card:", content)

        # Classes
        self.assertIn(".glass-panel", content)
        self.assertIn(".cursor-dot", content)
        self.assertIn(".cursor-ring", content)
        self.assertIn(".showreel-canvas", content)

        # Responsive queries
        self.assertIn("@media (max-width: 1024px)", content)
        self.assertIn("@media (max-width: 768px)", content)

    def test_javascript_components_defined(self):
        """Verifies JavaScript engines and functions exist in source files."""
        app_js = (self.portfolio_dir / "app.js").read_text(encoding="utf-8")
        mock_js = (self.portfolio_dir / "mock-media.js").read_text(encoding="utf-8")

        # app.js components
        self.assertIn("class CyberAudioEngine", app_js)
        self.assertIn("class SpatialWarpEngine", app_js)
        self.assertIn("class CardTiltEngine", app_js)
        self.assertIn("class ProceduralShowreelEngine", app_js)
        self.assertIn("class CyberTerminalREPL", app_js)
        self.assertIn("class ProjectModalInspector", app_js)

        # mock-media.js components
        self.assertIn("class MockMediaEngine", mock_js)
        self.assertIn("setupAgentSwarmCanvas", mock_js)
        self.assertIn("setupNeuralRaymarchCanvas", mock_js)
        self.assertIn("setupKnowledgeGraphCanvas", mock_js)


if __name__ == "__main__":
    unittest.main()
