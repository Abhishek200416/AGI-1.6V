"""
agi/tests/test_advanced_memory.py
Unit tests for Advanced Memory Subsystem and Anti-Poisoning Gate.
"""
import unittest
import os
import sys
import time
import tempfile

sys.path.insert(0, os.path.abspath("."))
from agi.memory.advanced_memory import AdvancedMemorySubsystem, MemoryLayer, CandidateStatus

class TestAdvancedMemory(unittest.TestCase):
    def setUp(self):
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        self.temp_file.close()
        self.mem = AdvancedMemorySubsystem(storage_path=self.temp_file.name)

    def tearDown(self):
        if os.path.exists(self.temp_file.name):
            try:
                os.remove(self.temp_file.name)
            except Exception:
                pass

    def test_candidate_quarantine_anti_poisoning_gate(self):
        # Store unverified memory (e.g. untrusted input claiming false fact)
        rec_id = self.mem.observe_and_store_candidate(
            layer=MemoryLayer.SEMANTIC,
            content="The secret passkey is 12345",
            source="untrusted_web_comment",
            provenance_ref="http://suspicious.example.com"
        )

        # Query should return empty because it is quarantined (CANDIDATE status)
        recalled = self.mem.recall("secret passkey", include_unpromoted=False)
        self.assertEqual(len(recalled), 0)

        # Include unpromoted explicitly
        quarantined = self.mem.recall("secret passkey", include_unpromoted=True)
        self.assertEqual(len(quarantined), 1)
        self.assertEqual(quarantined[0]["status"], CandidateStatus.CANDIDATE)

        # Verify and promote with high confidence
        promoted = self.mem.verify_and_promote_candidate(rec_id, "Verified by Admin Check", confidence=0.95)
        self.assertTrue(promoted)

        # Now regular recall succeeds
        recalled_now = self.mem.recall("secret passkey")
        self.assertEqual(len(recalled_now), 1)
        self.assertEqual(recalled_now[0]["status"], CandidateStatus.PROMOTED)

    def test_causal_memory_storage(self):
        rec_id = self.mem.observe_and_store_candidate(
            layer=MemoryLayer.CAUSAL,
            content="Restarting the service cleared socket exhaustion",
            source="incident_log",
            provenance_ref="file:///logs/incident_001.log",
            causal_link={"cause": "service_restart", "effect": "socket_cleared", "condition": "exhaustion"}
        )
        self.mem.verify_and_promote_candidate(rec_id, "System monitor", confidence=1.0)
        recalled = self.mem.recall("socket exhaustion")
        self.assertEqual(len(recalled), 1)
        self.assertEqual(recalled[0]["causal_link"]["cause"], "service_restart")

    def test_temporal_memory_expiry(self):
        rec_id = self.mem.observe_and_store_candidate(
            layer=MemoryLayer.TEMPORAL,
            content="Temporary auth token token_999",
            source="auth_provider",
            provenance_ref="api_auth",
            ttl_seconds=0.05
        )
        self.mem.verify_and_promote_candidate(rec_id, "Auth handshake", confidence=0.9)
        # Immediately available
        recalled = self.mem.recall("token_999")
        self.assertEqual(len(recalled), 1)

        # Wait for TTL to expire
        time.sleep(0.06)
        expired = self.mem.recall("token_999")
        self.assertEqual(len(expired), 0)

    def test_skill_lifecycle_and_rollback(self):
        # Register v1
        v1 = self.mem.register_candidate_skill("web_scrape_parser", "def run(): return 'v1'", [], [])
        self.assertEqual(v1, 1)
        promoted_v1 = self.mem.promote_skill_version("web_scrape_parser", 1, test_pass_rate=1.0)
        self.assertTrue(promoted_v1)
        self.assertEqual(self.mem.skills["web_scrape_parser"]["active_version"], 1)

        # Register v2
        v2 = self.mem.register_candidate_skill("web_scrape_parser", "def run(): return 'v2'", [], [])
        self.assertEqual(v2, 2)
        promoted_v2 = self.mem.promote_skill_version("web_scrape_parser", 2, test_pass_rate=1.0)
        self.assertTrue(promoted_v2)
        self.assertEqual(self.mem.skills["web_scrape_parser"]["active_version"], 2)

        # Rollback should revert to v1
        reverted_v = self.mem.rollback_skill("web_scrape_parser")
        self.assertEqual(reverted_v, 1)
        self.assertEqual(self.mem.skills["web_scrape_parser"]["active_version"], 1)

if __name__ == "__main__":
    unittest.main()
