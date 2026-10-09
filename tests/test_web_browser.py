"""
tests/test_web_browser.py
Unit and Integration verification suite for AGI 0.7 Web Browser Engine.
"""

import unittest
import os
import sys

sys.path.insert(0, os.path.abspath("."))
from agi.computer.web_browser import (
    WebBrowserEngine,
    validate_destination_url,
    SSRFSecurityError,
    extract_factual_evidence_bundle
)

class TestWebBrowser(unittest.TestCase):
    def setUp(self):
        self.browser = WebBrowserEngine(timeout_seconds=8)

    def test_ssrf_security_guard(self):
        # Valid URLs
        self.assertEqual(validate_destination_url("https://en.wikipedia.org/wiki/Main_Page"), "https://en.wikipedia.org/wiki/Main_Page")
        self.assertEqual(validate_destination_url("http://example.com"), "http://example.com")
        
        # SSRF blocked destinations
        with self.assertRaises(SSRFSecurityError):
            validate_destination_url("http://localhost:8080/admin")
            
        with self.assertRaises(SSRFSecurityError):
            validate_destination_url("http://127.0.0.1:5000/secret")
            
        with self.assertRaises(SSRFSecurityError):
            validate_destination_url("http://169.254.169.254/latest/meta-data/")
            
        with self.assertRaises(SSRFSecurityError):
            validate_destination_url("http://10.0.1.5/internal")
            
        with self.assertRaises(SSRFSecurityError):
            validate_destination_url("ftp://example.com/file")

    def test_wikipedia_api_search(self):
        results = self.browser.search("Alan Turing", max_results=3)
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)
        first = results[0]
        self.assertIn("title", first)
        self.assertIn("url", first)
        self.assertIn("snippet", first)
        self.assertTrue(first["url"].startswith("http"))

    def test_direct_page_navigation_and_text_extraction(self):
        # Fetch public documentation page
        res = self.browser.navigate("https://en.wikipedia.org/wiki/Python_(programming_language)")
        self.assertTrue(res["success"])
        self.assertIn("Python", res["title"])
        self.assertGreater(len(res["content"]), 100)
        self.assertIsInstance(res["links"], list)
        self.assertIn("https://en.wikipedia.org/wiki/Python_(programming_language)", self.browser.visited_urls)

    def test_evidence_extraction_bundle(self):
        bundle = extract_factual_evidence_bundle("Grace Hopper compiler", self.browser, max_hops=1)
        self.assertIn("evidence", bundle)
        self.assertGreater(bundle["evidence_count"], 0)
        self.assertGreater(len(bundle["sources"]), 0)


if __name__ == "__main__":
    unittest.main()
