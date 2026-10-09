"""
tests/test_memoryarena_repair.py
Verification suite for AGI 0.7 MemoryArena MockWebShopCatalog and ASIN retrieval.
"""

import sys
import os
import unittest
import json

sys.path.insert(0, os.path.abspath("."))
from agi.adapters.memoryarena_adapter import (
    MockWebShopCatalog,
    MOCK_WEBSHOP_PRODUCTS,
    run_memoryarena_session_task
)


class TestMemoryArenaRepair(unittest.TestCase):

    def setUp(self):
        self.catalog = MockWebShopCatalog()

    def test_catalog_search(self):
        results = self.catalog.search("Ethiopian whole bean coffee")
        self.assertGreater(len(results), 0)
        top = results[0]
        self.assertEqual(top["asin"], "B07T48N6MN")
        self.assertIn("Ethiopian", top["title"])

    def test_catalog_get_item(self):
        item = self.catalog.get_item("B07T48N6MN")
        self.assertIsNotNone(item)
        self.assertEqual(item["price"], 18.99)
        self.assertEqual(item["category"], "Grocery")
        self.assertEqual(item["attributes"]["roast"], "Dark")

    def test_catalog_get_nonexistent_item(self):
        item = self.catalog.get_item("B00INVALID00")
        self.assertIsNone(item)

    def test_all_mock_products_have_valid_asins(self):
        import re
        asin_pattern = re.compile(r"^B[0-9A-Z]{9}$")
        self.assertEqual(len(MOCK_WEBSHOP_PRODUCTS), 12)
        for p in MOCK_WEBSHOP_PRODUCTS:
            self.assertTrue(asin_pattern.match(p["asin"]), f"Invalid ASIN: {p['asin']}")
            self.assertIn("title", p)
            self.assertIn("category", p)
            self.assertIn("price", p)


if __name__ == "__main__":
    unittest.main()
