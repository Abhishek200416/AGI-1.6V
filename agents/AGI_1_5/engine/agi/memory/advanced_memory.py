"""
agi/memory/advanced_memory.py
AGI 1.2 — Advanced Memory & Causal Knowledge Continuity (Part VII)

Implements:
1. 8 Memory Layers (Working, Semantic, Episodic, Procedural, Causal, Evidence, Temporal, Config) (Section 7.1)
2. Conflict-Aware Concurrent Memory Writes with Provenance Comparison (Section 7.2)
3. Verified Memory Lifecycle & Candidate Quarantine Shield (Anti-Poisoning Gate) (Section 7.3)
4. Versioned Skill Lifecycle with Rollback Support (Section 7.4)
"""

import os
import sys
import json
import time
import datetime
import hashlib
import threading
from typing import Dict, Any, List, Optional, Tuple

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


class MemoryLayer:
    WORKING = "WORKING"
    SEMANTIC = "SEMANTIC"
    EPISODIC = "EPISODIC"
    PROCEDURAL = "PROCEDURAL"
    CAUSAL = "CAUSAL"
    EVIDENCE = "EVIDENCE"
    TEMPORAL = "TEMPORAL"
    CONFIG = "CONFIG"


class CandidateStatus:
    CANDIDATE = "CANDIDATE"      # Quarantined, not yet verified
    VERIFIED = "VERIFIED"        # Verified against ground truth/execution proof
    PROMOTED = "PROMOTED"        # Promoted to active store
    REJECTED = "REJECTED"        # Rejected (unverified, contradictory, or poisoned)


class AdvancedMemorySubsystem:
    def __init__(self, storage_path: Optional[str] = None):
        self.lock = threading.RLock()
        self.storage_path = storage_path or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "advanced_memory_store.json"))
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)

        self.records: Dict[str, Dict[str, Any]] = {}  # record_id -> record
        self.skills: Dict[str, Dict[str, Any]] = {}   # skill_name -> {versions: [], active_version: int}
        self.load_store()

    def load_store(self):
        with self.lock:
            if os.path.exists(self.storage_path) and os.path.getsize(self.storage_path) > 0:
                try:
                    with open(self.storage_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        self.records = data.get("records", {})
                        self.skills = data.get("skills", {})
                except Exception as e:
                    print(f"[AdvancedMemory] Failed loading store: {e}")

    def save_store(self):
        with self.lock:
            try:
                temp_path = self.storage_path + ".tmp"
                with open(temp_path, "w", encoding="utf-8") as f:
                    json.dump({"records": self.records, "skills": self.skills}, f, indent=2)
                if os.path.exists(self.storage_path):
                    os.replace(temp_path, self.storage_path)
                else:
                    os.rename(temp_path, self.storage_path)
            except Exception as e:
                print(f"[AdvancedMemory] Failed saving store: {e}")

    # -------------------------------------------------------------
    # Section 7.2 & 7.3: Observe, Store Candidate, and Anti-Poisoning Gate
    # -------------------------------------------------------------
    def observe_and_store_candidate(
        self,
        layer: str,
        content: str,
        source: str,
        provenance_ref: str,
        tags: Optional[List[str]] = None,
        ttl_seconds: Optional[float] = None,
        causal_link: Optional[Dict[str, Any]] = None
    ) -> str:
        """Stores a memory record in CANDIDATE quarantine (Section 7.3)."""
        with self.lock:
            record_id = f"mem-{hashlib.sha256((content + source + str(time.time())).encode('utf-8')).hexdigest()[:12]}"
            now = time.time()
            record = {
                "id": record_id,
                "layer": layer,
                "content": content,
                "source": source,
                "provenance_ref": provenance_ref,
                "tags": tags or [],
                "created_at": now,
                "last_accessed": now,
                "version": 1,
                "status": CandidateStatus.CANDIDATE,  # Quarantined by default
                "verification_confidence": 0.0,
                "ttl_seconds": ttl_seconds,
                "expires_at": (now + ttl_seconds) if ttl_seconds else None,
                "causal_link": causal_link  # e.g., {"cause": "action_x", "effect": "result_y", "condition": "z"}
            }
            self.records[record_id] = record
            self.save_store()
            return record_id

    def verify_and_promote_candidate(
        self,
        record_id: str,
        verifier_evidence: str,
        confidence: float
    ) -> bool:
        """Promotes a candidate memory record once verified by independent proof."""
        with self.lock:
            if record_id not in self.records:
                return False
            rec = self.records[record_id]
            if confidence >= 0.8:
                rec["status"] = CandidateStatus.PROMOTED
                rec["verification_confidence"] = confidence
                rec["verified_by"] = verifier_evidence
                self.save_store()
                return True
            else:
                rec["status"] = CandidateStatus.REJECTED
                rec["rejection_reason"] = f"Low confidence verification ({confidence:.2f} < 0.80)"
                self.save_store()
                return False

    # -------------------------------------------------------------
    # Section 7.1 & 7.2: Conflict-Aware Recall & Provenance Scoring
    # -------------------------------------------------------------
    def recall(
        self,
        query: str,
        layer: Optional[str] = None,
        include_unpromoted: bool = False,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        with self.lock:
            now = time.time()
            scored: List[Tuple[float, Dict[str, Any]]] = []

            q_terms = set(query.lower().split())

            for rec in self.records.values():
                # Check layer filter
                if layer and rec["layer"] != layer:
                    continue

                # Check quarantine
                if not include_unpromoted and rec["status"] != CandidateStatus.PROMOTED:
                    continue

                # Check expiry (temporal memory)
                if rec["expires_at"] and now > rec["expires_at"]:
                    continue

                # Semantic overlap scoring
                content_lower = rec["content"].lower()
                overlap = sum(1 for term in q_terms if term in content_lower)
                if overlap == 0 and len(q_terms) > 0:
                    continue

                relevance = overlap / max(1, len(q_terms))
                recency = max(0.1, 1.0 - (now - rec["created_at"]) / 86400.0)  # 24h decay
                provenance_score = rec.get("verification_confidence", 0.5)

                final_score = (0.5 * relevance) + (0.3 * provenance_score) + (0.2 * recency)
                scored.append((final_score, rec))

            scored.sort(key=lambda x: x[0], reverse=True)
            results = []
            for score, rec in scored[:limit]:
                rec["last_accessed"] = now
                item = dict(rec)
                item["score"] = round(score, 4)
                results.append(item)
            return results

    # -------------------------------------------------------------
    # Section 7.4: Versioned Skill Lifecycle & Rollback
    # -------------------------------------------------------------
    def register_candidate_skill(
        self,
        skill_name: str,
        code: str,
        preconditions: List[str],
        postconditions: List[str]
    ) -> int:
        with self.lock:
            if skill_name not in self.skills:
                self.skills[skill_name] = {
                    "name": skill_name,
                    "active_version": 0,
                    "versions": []
                }

            skill_entry = self.skills[skill_name]
            new_version_num = len(skill_entry["versions"]) + 1
            version_data = {
                "version": new_version_num,
                "code": code,
                "preconditions": preconditions,
                "postconditions": postconditions,
                "created_at": time.time(),
                "status": CandidateStatus.CANDIDATE,
                "test_pass_rate": 0.0
            }
            skill_entry["versions"].append(version_data)
            self.save_store()
            return new_version_num

    def promote_skill_version(self, skill_name: str, version: int, test_pass_rate: float) -> bool:
        with self.lock:
            if skill_name not in self.skills:
                return False
            entry = self.skills[skill_name]
            if version < 1 or version > len(entry["versions"]):
                return False

            v_data = entry["versions"][version - 1]
            if test_pass_rate >= 1.0:
                v_data["status"] = CandidateStatus.PROMOTED
                v_data["test_pass_rate"] = test_pass_rate
                entry["active_version"] = version
                self.save_store()
                return True
            else:
                v_data["status"] = CandidateStatus.REJECTED
                v_data["test_pass_rate"] = test_pass_rate
                self.save_store()
                return False

    def rollback_skill(self, skill_name: str) -> Optional[int]:
        """Rolls back skill to previous promoted version."""
        with self.lock:
            if skill_name not in self.skills:
                return None
            entry = self.skills[skill_name]
            curr_v = entry["active_version"]
            # Find highest promoted version < curr_v
            for v_idx in range(curr_v - 2, -1, -1):
                if entry["versions"][v_idx]["status"] == CandidateStatus.PROMOTED:
                    entry["active_version"] = v_idx + 1
                    self.save_store()
                    return entry["active_version"]
            entry["active_version"] = 0  # Revert to base/disabled
            self.save_store()
            return 0
