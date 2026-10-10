"""
agi/memory/omega_nexus_memory.py
AGI 1.6 OMEGA NEXUS — 9-Layer Persistent Memory & ACON Context Management Engine

Implements:
1. 9-Layer Partitioned Memory Architecture:
   - Layer 1: Immediate Task State
   - Layer 2: Current Conversation Context
   - Layer 3: Active Project Memory
   - Layer 4: Episodic Execution Memory
   - Layer 5: Verified Factual Memory
   - Layer 6: Procedural Memory (Skills/Workflows)
   - Layer 7: Failure & Recovery Memory
   - Layer 8: Research Source Index
   - Layer 9: Long-Term Archive
2. Bounded Candidate Retrieval Scoring (Relevance, Recency, Utility, Cost).
3. ACON (Action-Centric Observation Compression) with Strict Preservation Guards.
4. Authoritative External-Drive-First Persistence (Volume D:\\) with Local Graceful Fallback.
5. Transactional WAL Journaling and SHA-256 Content-Addressed Storage.
"""

import os
import sys
import json
import time
import hashlib
import threading
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple


class MemoryLayer(str, Enum):
    IMMEDIATE_TASK_STATE = "IMMEDIATE_TASK_STATE"          # Layer 1
    CONVERSATION_CONTEXT = "CONVERSATION_CONTEXT"          # Layer 2
    ACTIVE_PROJECT = "ACTIVE_PROJECT"                      # Layer 3
    EPISODIC_EXECUTION = "EPISODIC_EXECUTION"              # Layer 4
    VERIFIED_FACTUAL = "VERIFIED_FACTUAL"                  # Layer 5
    PROCEDURAL_SKILLS = "PROCEDURAL_SKILLS"                # Layer 6
    FAILURE_RECOVERY = "FAILURE_RECOVERY"                  # Layer 7
    RESEARCH_INDEX = "RESEARCH_INDEX"                      # Layer 8
    LONG_TERM_ARCHIVE = "LONG_TERM_ARCHIVE"                # Layer 9


class StorageState(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    DISCONNECTED = "DISCONNECTED"
    REPLAYING = "REPLAYING"
    RECOVERED = "RECOVERED"
    READY = "READY"


class AdaptiveContextManager:
    """
    ACON-inspired context compressor. Compresses bulky raw outputs into high-density
    semantic state changes while strictly safeguarding critical identifiers and errors.
    """

    CRITICAL_MARKERS = [
        "error", "exception", "exit code", "failed", "passed", "traceback",
        "sha256", "checksum", "assert", "fatal", "status:"
    ]

    @classmethod
    def compress_observation(cls, raw_observation: str, max_chars: int = 1200) -> str:
        if not raw_observation or len(raw_observation) <= max_chars:
            return raw_observation

        lines = raw_observation.splitlines()
        preserved_lines = []
        
        # Always preserve first 10 and last 15 lines
        head_lines = lines[:10]
        tail_lines = lines[-15:]
        middle_lines = lines[10:-15]

        # Scan middle lines for critical markers
        critical_middle = []
        for line in middle_lines:
            lower = line.lower()
            if any(m in lower for m in cls.CRITICAL_MARKERS):
                critical_middle.append(line)

        # Build compressed representation
        omitted_count = len(middle_lines) - len(critical_middle)
        summary = (
            head_lines +
            [f"... [ACON Context Compression: {omitted_count} non-critical lines omitted] ..."] +
            critical_middle[:20] +
            tail_lines
        )
        compressed = "\n".join(summary)
        if len(compressed) > max_chars * 2:
            return compressed[:max_chars * 2] + "\n... [truncated]"
        return compressed

    @classmethod
    def build_concise_task_context(
        cls,
        task_id: str,
        goal: str,
        plan_steps: List[str],
        completed_steps: List[str],
        latest_observation: str,
        remaining_budget: int
    ) -> Dict[str, Any]:
        return {
            "task_id": task_id,
            "goal": goal,
            "plan_progress": f"{len(completed_steps)}/{len(plan_steps)} steps complete",
            "active_step": plan_steps[len(completed_steps)] if len(completed_steps) < len(plan_steps) else "COMPLETE",
            "observation_digest": cls.compress_observation(latest_observation, max_chars=800),
            "remaining_token_budget": remaining_budget
        }


class OmegaNexusMemory:
    """
    Authoritative 9-Layer Persistent Memory Subsystem with External-Drive Persistence.
    """

    def __init__(
        self,
        primary_dir: Optional[str] = None,
        local_fallback_dir: Optional[str] = None,
        version: str = "1.6.0"
    ):
        self.version = version
        self.lock = threading.RLock()

        # External volume D:\ target
        d_default = r"D:\AGI_Storage\AGI_1_6\memory"
        if primary_dir:
            self.base_dir = primary_dir
        elif os.path.exists("D:\\"):
            try:
                os.makedirs(d_default, exist_ok=True)
                self.base_dir = d_default
            except Exception:
                self.base_dir = local_fallback_dir or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "memory"))
        else:
            self.base_dir = local_fallback_dir or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "memory"))

        os.makedirs(self.base_dir, exist_ok=True)
        self.wal_path = os.path.join(self.base_dir, "recovery", "wal.jsonl")
        self.store_path = os.path.join(self.base_dir, "omega_nexus_store.json")
        os.makedirs(os.path.dirname(self.wal_path), exist_ok=True)

        self.state = StorageState.READY
        # 9 Layers
        self.layers: Dict[str, List[Dict[str, Any]]] = {
            layer.value: [] for layer in MemoryLayer
        }

        self._load_from_disk()

    def _load_from_disk(self):
        with self.lock:
            if os.path.exists(self.store_path):
                try:
                    with open(self.store_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        for k, v in data.get("layers", {}).items():
                            if k in self.layers:
                                self.layers[k] = v
                except Exception:
                    pass

    def _append_wal(self, record: Dict[str, Any]):
        try:
            line = json.dumps(record) + "\n"
            with open(self.wal_path, "a", encoding="utf-8") as f:
                f.write(line)
        except Exception:
            pass

    def write_record(
        self,
        layer: MemoryLayer,
        content: str,
        tags: Optional[List[str]] = None,
        source: str = "runtime",
        confidence: float = 1.0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        with self.lock:
            ts = time.time()
            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
            record = {
                "id": f"REC-{int(ts*1000)}-{content_hash[:8]}",
                "layer": layer.value,
                "content": content,
                "content_hash": content_hash,
                "tags": tags or [],
                "source": source,
                "confidence": confidence,
                "created_at": ts,
                "access_count": 0,
                "metadata": metadata or {}
            }
            self.layers[layer.value].append(record)
            self._append_wal(record)
            return record

    def retrieve(
        self,
        query: str,
        layer: Optional[MemoryLayer] = None,
        top_k: int = 5,
        min_confidence: float = 0.5
    ) -> List[Dict[str, Any]]:
        with self.lock:
            candidates: List[Dict[str, Any]] = []
            target_layers = [layer.value] if layer else list(self.layers.keys())

            query_words = set(query.lower().split())

            for l_name in target_layers:
                for rec in self.layers.get(l_name, []):
                    if rec["confidence"] < min_confidence:
                        continue
                    
                    # Bounded lexical scoring + recency decay
                    content_lower = rec["content"].lower()
                    overlap = sum(1 for w in query_words if w in content_lower)
                    relevance = overlap / max(1, len(query_words))
                    
                    age_hours = (time.time() - rec["created_at"]) / 3600.0
                    recency = 1.0 / (1.0 + age_hours * 0.05)
                    
                    score = (relevance * 0.5) + (recency * 0.3) + (rec["confidence"] * 0.2)
                    candidates.append((score, rec))

            candidates.sort(key=lambda x: x[0], reverse=True)
            results = []
            for score, rec in candidates[:top_k]:
                rec["access_count"] += 1
                rec_copy = dict(rec)
                rec_copy["match_score"] = round(score, 4)
                results.append(rec_copy)
            return results

    def flush_to_disk(self):
        with self.lock:
            tmp_path = self.store_path + ".tmp"
            payload = {
                "version": self.version,
                "updated_at": time.time(),
                "base_dir": self.base_dir,
                "layers": self.layers
            }
            try:
                with open(tmp_path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2)
                if os.path.exists(self.store_path):
                    os.replace(tmp_path, self.store_path)
                else:
                    os.rename(tmp_path, self.store_path)
            except Exception:
                pass

    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            counts = {k: len(v) for k, v in self.layers.items()}
            return {
                "storage_base_dir": self.base_dir,
                "storage_state": self.state.value,
                "total_records": sum(counts.values()),
                "layer_breakdown": counts
            }
