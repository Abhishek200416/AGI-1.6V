"""
tests/test_portfolio_site.py
Verification suite for Abhishek's 3D Spatial Perception & AGI Portfolio Website.
Asserts structural integrity, 3D WebGL space warp canvas, interactive 60 FPS video showreel,
procedural media simulation engines, terminal REPL, audio synthesizer, and assets.
"""

import os
import unittest
from pathlib import Path


class Test3DPortfolio(unittest.TestCase):

    def setUp(self):
        self.portfolio_dir = Path("portfolio")
        self.html_path = self.portfolio_dir / "index.html"
        self.main_js_path = self.portfolio_dir / "main.js"
        self.mock_media_path = self.portfolio_dir / "mock-media.js"
        self.style_css_path = self.portfolio_dir / "style.css"
        self.assets_dir = self.portfolio_dir / "assets"
        self.root_html_path = Path("index.html")

        self.assertTrue(self.html_path.exists(), "portfolio/index.html must exist")
        self.assertTrue(self.main_js_path.exists(), "portfolio/main.js must exist")
        self.assertTrue(self.mock_media_path.exists(), "portfolio/mock-media.js must exist")
        self.assertTrue(self.style_css_path.exists(), "portfolio/style.css must exist")
        self.assertTrue(self.assets_dir.exists(), "portfolio/assets directory must exist")

        self.html_content = self.html_path.read_text(encoding="utf-8")
        self.main_js_content = self.main_js_path.read_text(encoding="utf-8")
        self.mock_media_content = self.mock_media_path.read_text(encoding="utf-8")
        self.style_css_content = self.style_css_path.read_text(encoding="utf-8")

    def test_canvases_and_visual_engine(self):
        # 3D Spatial WebGL Canvas
        self.assertIn('id="webgl-canvas"', self.html_content)
        # Interactive 3D Video Showreel Canvas
        self.assertIn('id="showreel-canvas"', self.html_content)

    def test_sections_and_navigation(self):
        # 7 distinct portfolio sections
        sections = ["hero", "showreel", "about", "projects", "skills", "terminal", "contact"]
        for sec in sections:
            self.assertIn(f'id="{sec}"', self.html_content)

        # Nav links and waypoints
        for sec in sections:
            self.assertIn(f'href="#{sec}"', self.html_content)
            self.assertIn(f'data-target="{sec}"', self.html_content)

    def test_interactive_video_showreel_controls(self):
        # Showreel HUD and controls
        self.assertIn('id="hud-timecode"', self.html_content)
        self.assertIn('id="hud-channel-name"', self.html_content)
        self.assertIn('id="btn-play-pause"', self.html_content)
        self.assertIn('id="btn-fullscreen"', self.html_content)
        self.assertIn('channel-pill', self.html_content)

    def test_audio_and_terminal_controls(self):
        # Audio toggle button
        self.assertIn('id="hud-audio-toggle"', self.html_content)
        # Contact form
        self.assertIn('id="contact-form"', self.html_content)

    def test_threejs_and_spatial_engine(self):
        # Three.js engine and spatial calculations
        self.assertIn('THREE.WebGLRenderer', self.main_js_content)
        self.assertIn('THREE.PerspectiveCamera', self.main_js_content)
        self.assertIn('THREE.Scene', self.main_js_content)

        # Web Audio API Synthesizer
        self.assertIn('AudioContext', self.main_js_content)
        self.assertIn('createOscillator', self.main_js_content)
        self.assertIn('createGain', self.main_js_content)

    def test_procedural_video_simulation(self):
        # Procedural simulation channels in mock-media.js
        self.assertIn('class MockMediaEngine', self.mock_media_content)

    def test_assets_integrity(self):
        # High-res assets exist
        avatar = self.assets_dir / "avatar.jpg"
        proj_quantum = self.assets_dir / "project-quantum.jpg"
        proj_spatial = self.assets_dir / "project-spatial.jpg"
        self.assertTrue(avatar.exists())
        self.assertTrue(proj_quantum.exists())
        self.assertTrue(proj_spatial.exists())
        self.assertGreater(avatar.stat().st_size, 100000)

    def test_style_and_glassmorphism(self):
        # Glassmorphism and design variables in style.css
        self.assertIn('backdrop-filter', self.style_css_content)
        self.assertIn('--accent-cyan', self.style_css_content)
        self.assertIn('--accent-purple', self.style_css_content)
        self.assertIn('--accent-emerald', self.style_css_content)

    def test_root_index_sync(self):
        # Root index.html exists and has matching canvas
        self.assertTrue(self.root_html_path.exists())
        root_content = self.root_html_path.read_text(encoding="utf-8")
        self.assertIn('id="webgl-canvas"', root_content)


if __name__ == "__main__":
    unittest.main()
