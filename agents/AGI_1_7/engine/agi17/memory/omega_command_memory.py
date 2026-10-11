"""AGI 1.7 Omega Command 10-Layer Persistent Memory & ACON Context Compressor.

Provides durable SQLite WAL storage on D:\\AGI_Storage\\AGI_1_7\\memory (with
automatic local fallback if D:\\ is unavailable), 10 distinct memory layers,
mandatory pre-planning retrieval with audit logs, fact supersession history,
and ACON-style structural observation compression.
"""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import threading
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence


MEMORY_LAYERS: Dict[int, str] = {
    1: "ACTIVE_TURN_SCRATCHPAD",
    2: "TASK_WORKING_MEMORY",
    3: "SUBAGENT_SHARED_ARTIFACTS",
    4: "COMPRESSED_EPISODIC_TRACE",
    5: "CROSS_SESSION_SEMANTIC_FACTS",
    6: "PROCEDURAL_WORKFLOW_RECIPES",
    7: "FAILURE_PATTERNS_AND_PLAYBOOKS",
    8: "RESOURCE_AND_ENV_PROFILES",
    9: "VERIFIED_RESEARCH_CACHE",
    10: "IMMUTABLE_AUDIT_AND_BENCHMARK_LEDGER",
}

# Regexes for ACON preservation of critical tokens
SHA256_RE = re.compile(r"\b[a-fA-F0-9]{64}\b")
EXIT_CODE_RE = re.compile(r"(?:exit[_\s-]?code|returncode|status)\s*[:=]\s*(-?\d+)", re.IGNORECASE)
FILE_PATH_RE = re.compile(r"(?:[a-zA-Z]:\\[^\s\"',;]+|/[\w.\-/]+\.[\w]+)")
ERROR_NAME_RE = re.compile(r"\b([A-Z][a-zA-Z0-9_]*(?:Error|Exception|Timeout|Failure|Fault))\b")
TASK_ID_RE = re.compile(r"\b(?:TASK|SUBTASK|MISSION|CAMPAIGN|NOTIF|CHK)-[A-Za-z0-9_\-]+\b")


@dataclass
class MemoryEntry:
    entry_id: str
    layer: int
    layer_name: str
    subject_key: str
    content: str
    structured_data: Dict[str, Any]
    tags: List[str]
    source_task_id: Optional[str]
    session_id: str
    confidence: float
    created_at: float
    updated_at: float
    expires_at: Optional[float] = None
    access_count: int = 0
    useful_count: int = 0
    supersedes_id: Optional[str] = None
    superseded_by_id: Optional[str] = None
    is_active: bool = True


class ACONCompressor:
    """ACON-inspired observation and history compressor preserving critical execution anchors."""

    @staticmethod
    def compress_observation(
        raw_text: str,
        max_chars: int = 600,
        preserve_identifiers: Optional[Sequence[str]] = None,
    ) -> Dict[str, Any]:
        raw_len = len(raw_text)
        raw_est_tokens = max(1, raw_len // 4)

        sha256_hashes = list(dict.fromkeys(SHA256_RE.findall(raw_text)))
        exit_codes = list(dict.fromkeys(EXIT_CODE_RE.findall(raw_text)))
        file_paths = list(dict.fromkeys(FILE_PATH_RE.findall(raw_text)))[:10]
        error_names = list(dict.fromkeys(ERROR_NAME_RE.findall(raw_text)))[:10]
        task_ids = list(dict.fromkeys(TASK_ID_RE.findall(raw_text)))[:10]
        extra_ids = [ident for ident in (preserve_identifiers or []) if ident in raw_text]

        if raw_len <= max_chars:
            compressed_text = raw_text
        else:
            lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
            head = lines[:3]
            tail = lines[-4:] if len(lines) > 3 else []
            preserved_parts: List[str] = []
            if task_ids:
                preserved_parts.append(f"tasks={','.join(task_ids[:4])}")
            if exit_codes:
                preserved_parts.append(f"exit_codes={','.join(exit_codes[:3])}")
            if error_names:
                preserved_parts.append(f"errors={','.join(error_names[:4])}")
            if file_paths:
                preserved_parts.append(f"paths={','.join(file_paths[:3])}")
            if sha256_hashes:
                preserved_parts.append(f"sha256={','.join(sha256_hashes[:2])}")
            if extra_ids:
                preserved_parts.append(f"anchors={','.join(extra_ids[:4])}")

            anchor_summary = " | ".join(preserved_parts)
            body = " ... ".join(head + ([f"[{anchor_summary}]"] if anchor_summary else []) + tail)
            if len(body) > max_chars:
                # Guarantee preserved anchors stay intact at the start
                prefix = f"[{anchor_summary}] " if anchor_summary else ""
                remaining = max(60, max_chars - len(prefix))
                half = remaining // 2
                body = prefix + raw_text[:half].strip() + " ... " + raw_text[-half:].strip()
            compressed_text = body

        comp_len = len(compressed_text)
        comp_est_tokens = max(1, comp_len // 4)
        reduction_ratio = round(1.0 - (comp_len / max(1, raw_len)), 4) if raw_len > comp_len else 0.0

        return {
            "compressed_text": compressed_text,
            "raw_chars": raw_len,
            "compressed_chars": comp_len,
            "raw_estimated_tokens": raw_est_tokens,
            "compressed_estimated_tokens": comp_est_tokens,
            "reduction_ratio": reduction_ratio,
            "preserved_anchors": {
                "task_ids": task_ids,
                "exit_codes": exit_codes,
                "error_names": error_names,
                "file_paths": file_paths,
                "sha256_hashes": sha256_hashes,
                "extra_identifiers": extra_ids,
            },
        }


class OmegaCommandMemory:
    """10-Layer cross-session SQLite WAL persistent memory with mandatory pre-planning retrieval."""

    def __init__(
        self,
        primary_dir: str | Path = r"D:\AGI_Storage\AGI_1_7\memory",
        fallback_dir: Optional[str | Path] = None,
        session_id: Optional[str] = None,
        force_fallback: bool = False,
        mirror_dir: Optional[str | Path] = None,
    ) -> None:
        import os as _os
        import sys as _sys
        self.primary_dir = Path(primary_dir)
        default_fb = Path(__file__).resolve().parents[3] / "state_fallback" / "memory"
        resolved_fb = fallback_dir if fallback_dir is not None else mirror_dir
        self.fallback_dir = Path(resolved_fb) if resolved_fb is not None else default_fb
        self.session_id = session_id or f"SESSION-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
        self.using_fallback = False
        self._lock = threading.RLock()

        raw_prim = str(primary_dir)
        unmounted_drive = (
            len(raw_prim) >= 2
            and raw_prim[1] == ":"
            and (_sys.platform != "win32" or not _os.path.exists(raw_prim[:2] + "\\"))
        )

        if force_fallback or unmounted_drive:
            self.active_dir = self.fallback_dir
            self.using_fallback = True
            self.active_dir.mkdir(parents=True, exist_ok=True)
        else:
            try:
                self.primary_dir.mkdir(parents=True, exist_ok=True)
                probe = self.primary_dir / ".write_probe"
                probe.write_text("ok", encoding="utf-8")
                probe.unlink(missing_ok=True)
                self.active_dir = self.primary_dir
            except Exception:
                self.active_dir = self.fallback_dir
                self.using_fallback = True
                self.active_dir.mkdir(parents=True, exist_ok=True)

        self.db_path = self.active_dir / "omega_memory.db"
        self.audit_jsonl_path = self.active_dir / "memory_retrieval_audit.jsonl"
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=30.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self) -> None:
        with self._lock:
            conn = self._connect()
            try:
                with conn:
                    conn.executescript(
                        """
                        CREATE TABLE IF NOT EXISTS memory_entries (
                            entry_id TEXT PRIMARY KEY,
                            layer INTEGER NOT NULL,
                            layer_name TEXT NOT NULL,
                            subject_key TEXT NOT NULL,
                            content TEXT NOT NULL,
                            structured_json TEXT NOT NULL DEFAULT '{}',
                            tags_json TEXT NOT NULL DEFAULT '[]',
                            source_task_id TEXT,
                            session_id TEXT NOT NULL,
                            confidence REAL NOT NULL DEFAULT 1.0,
                            created_at REAL NOT NULL,
                            updated_at REAL NOT NULL,
                            expires_at REAL,
                            access_count INTEGER NOT NULL DEFAULT 0,
                            useful_count INTEGER NOT NULL DEFAULT 0,
                            supersedes_id TEXT,
                            superseded_by_id TEXT,
                            is_active INTEGER NOT NULL DEFAULT 1
                        );
                        CREATE INDEX IF NOT EXISTS idx_mem_layer_active ON memory_entries(layer, is_active);
                        CREATE INDEX IF NOT EXISTS idx_mem_subject ON memory_entries(subject_key, is_active);

                        CREATE TABLE IF NOT EXISTS retrieval_audit (
                            retrieval_id TEXT PRIMARY KEY,
                            session_id TEXT NOT NULL,
                            task_id TEXT,
                            query_text TEXT NOT NULL,
                            retrieved_entry_ids_json TEXT NOT NULL,
                            retrieved_count INTEGER NOT NULL,
                            timestamp REAL NOT NULL
                        );
                        """
                    )
            finally:
                conn.close()

    def store(
        self,
        *,
        layer: int,
        subject_key: str,
        content: str,
        structured_data: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        source_task_id: Optional[str] = None,
        confidence: float = 1.0,
        ttl_seconds: Optional[float] = None,
        supersede_existing_subject: bool = True,
        entry_id: Optional[str] = None,
    ) -> MemoryEntry:
        if layer not in MEMORY_LAYERS:
            raise ValueError(f"Invalid memory layer {layer}. Valid layers: 1..10")
        if layer == 10:
            # Layer 10 is append-only immutable audit ledger: never supersede existing records
            supersede_existing_subject = False

        now = time.time()
        eid = entry_id or f"MEM-L{layer}-{int(now * 1000)}-{uuid.uuid4().hex[:6]}"
        expires_at = (now + ttl_seconds) if ttl_seconds else None
        layer_name = MEMORY_LAYERS[layer]
        s_data = structured_data or {}
        tag_list = tags or []
        supersedes_id: Optional[str] = None

        with self._lock:
            conn = self._connect()
            try:
                with conn:
                    if supersede_existing_subject:
                        prev = conn.execute(
                            """
                            SELECT entry_id FROM memory_entries
                            WHERE layer = ? AND subject_key = ? AND is_active = 1
                            ORDER BY created_at DESC LIMIT 1
                            """,
                            (layer, subject_key),
                        ).fetchone()
                        if prev:
                            supersedes_id = str(prev["entry_id"])
                            conn.execute(
                                """
                                UPDATE memory_entries
                                SET is_active = 0, superseded_by_id = ?, updated_at = ?
                                WHERE entry_id = ?
                                """,
                                (eid, now, supersedes_id),
                            )

                    conn.execute(
                        """
                        INSERT INTO memory_entries (
                            entry_id, layer, layer_name, subject_key, content,
                            structured_json, tags_json, source_task_id, session_id,
                            confidence, created_at, updated_at, expires_at,
                            access_count, useful_count, supersedes_id, superseded_by_id, is_active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NULL, 1)
                        """,
                        (
                            eid,
                            layer,
                            layer_name,
                            subject_key,
                            content,
                            json.dumps(s_data, ensure_ascii=False),
                            json.dumps(tag_list, ensure_ascii=False),
                            source_task_id,
                            self.session_id,
                            confidence,
                            now,
                            now,
                            expires_at,
                            supersedes_id,
                        ),
                    )
            finally:
                conn.close()

        return MemoryEntry(
            entry_id=eid,
            layer=layer,
            layer_name=layer_name,
            subject_key=subject_key,
            content=content,
            structured_data=s_data,
            tags=tag_list,
            source_task_id=source_task_id,
            session_id=self.session_id,
            confidence=confidence,
            created_at=now,
            updated_at=now,
            expires_at=expires_at,
            supersedes_id=supersedes_id,
            is_active=True,
        )

    def retrieve(
        self,
        *,
        query: str = "",
        layers: Optional[Sequence[int]] = None,
        subject_key: Optional[str] = None,
        tags: Optional[Sequence[str]] = None,
        active_only: bool = True,
        limit: int = 15,
        task_id: Optional[str] = None,
    ) -> List[MemoryEntry]:
        now = time.time()
        sql = "SELECT * FROM memory_entries WHERE (expires_at IS NULL OR expires_at > ?)"
        params: List[Any] = [now]

        if active_only:
            sql += " AND is_active = 1"
        if layers:
            placeholders = ",".join("?" for _ in layers)
            sql += f" AND layer IN ({placeholders})"
            params.extend(layers)
        if subject_key:
            sql += " AND subject_key = ?"
            params.append(subject_key)

        with self._lock:
            conn = self._connect()
            try:
                rows = conn.execute(sql, tuple(params)).fetchall()
                entries = [self._row_to_entry(r) for r in rows]

                # Score by relevance, recency, confidence, and usefulness
                q_tokens = {tok.lower() for tok in re.findall(r"\w+", query) if len(tok) >= 2}
                req_tags = {t.lower() for t in (tags or [])}

                scored: List[tuple[float, MemoryEntry]] = []
                for e in entries:
                    if req_tags:
                        entry_tags = {t.lower() for t in e.tags}
                        if not (req_tags & entry_tags) and not q_tokens:
                            continue

                    score = e.confidence * 2.0 + min(3.0, e.useful_count * 0.5)
                    # Recency boost
                    age_hours = max(0.0, (now - e.updated_at) / 3600.0)
                    score += 1.5 / (1.0 + age_hours * 0.1)

                    if q_tokens:
                        haystack = f"{e.subject_key} {e.content} {' '.join(e.tags)}".lower()
                        matches = sum(1 for tok in q_tokens if tok in haystack)
                        if matches == 0 and not subject_key and not req_tags:
                            continue
                        score += matches * 3.0

                    if req_tags:
                        entry_tags = {t.lower() for t in e.tags}
                        score += len(req_tags & entry_tags) * 4.0

                    scored.append((score, e))

                scored.sort(key=lambda item: (item[0], item[1].updated_at), reverse=True)
                selected = [item[1] for item in scored[:limit]]

                if selected:
                    with conn:
                        for e in selected:
                            conn.execute(
                                "UPDATE memory_entries SET access_count = access_count + 1 WHERE entry_id = ?",
                                (e.entry_id,),
                            )
                            e.access_count += 1
                        retrieval_id = f"RET-{int(now * 1000)}-{uuid.uuid4().hex[:6]}"
                        conn.execute(
                            """
                            INSERT INTO retrieval_audit (
                                retrieval_id, session_id, task_id, query_text,
                                retrieved_entry_ids_json, retrieved_count, timestamp
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                retrieval_id,
                                self.session_id,
                                task_id,
                                query or (subject_key or "*"),
                                json.dumps([e.entry_id for e in selected]),
                                len(selected),
                                now,
                            ),
                        )
                    self._append_audit_jsonl(
                        {
                            "retrieval_id": retrieval_id,
                            "session_id": self.session_id,
                            "task_id": task_id,
                            "query": query or (subject_key or "*"),
                            "retrieved_entry_ids": [e.entry_id for e in selected],
                            "retrieved_count": len(selected),
                            "timestamp": now,
                        }
                    )
                return selected
            finally:
                conn.close()

    def retrieve_before_planning(
        self,
        task_id: str,
        task_description: str = "",
        *,
        query: Optional[str] = None,
        tags: Optional[Sequence[str]] = None,
    ) -> Dict[str, Any]:
        """Mandatory pre-planning memory lookup across semantic, procedural, failure, and episodic layers."""
        task_description = task_description or (query or "")
        semantic_facts = self.retrieve(
            query=task_description,
            layers=[5],
            tags=tags,
            active_only=True,
            limit=8,
            task_id=task_id,
        )
        procedural_recipes = self.retrieve(
            query=task_description,
            layers=[6],
            tags=tags,
            active_only=True,
            limit=5,
            task_id=task_id,
        )
        failure_playbooks = self.retrieve(
            query=task_description,
            layers=[7],
            tags=tags,
            active_only=True,
            limit=5,
            task_id=task_id,
        )
        episodic_traces = self.retrieve(
            query=task_description,
            layers=[4, 8, 9],
            tags=tags,
            active_only=True,
            limit=5,
            task_id=task_id,
        )

        # Even if specific keyword matches are empty, fetch top active preferences/constraints from Layer 5
        if not semantic_facts:
            semantic_facts = self.retrieve(
                query="",
                layers=[5],
                active_only=True,
                limit=5,
                task_id=task_id,
            )
        if not failure_playbooks:
            failure_playbooks = self.retrieve(
                query="",
                layers=[7],
                active_only=True,
                limit=3,
                task_id=task_id,
            )

        all_ids = [
            e.entry_id
            for group in (semantic_facts, procedural_recipes, failure_playbooks, episodic_traces)
            for e in group
        ]
        now = time.time()
        audit_id = f"PREPLAN-RET-{task_id}-{int(now * 1000)}"
        with self._lock:
            conn = self._connect()
            try:
                with conn:
                    conn.execute(
                        """
                        INSERT INTO retrieval_audit (
                            retrieval_id, session_id, task_id, query_text,
                            retrieved_entry_ids_json, retrieved_count, timestamp
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            audit_id,
                            self.session_id,
                            task_id,
                            f"PREPLAN:{task_description[:200]}",
                            json.dumps(all_ids),
                            len(all_ids),
                            now,
                        ),
                    )
            finally:
                conn.close()

        self._append_audit_jsonl(
            {
                "retrieval_id": audit_id,
                "event": "PRE_PLANNING_MEMORY_RETRIEVAL",
                "session_id": self.session_id,
                "task_id": task_id,
                "retrieved_entry_ids": all_ids,
                "retrieved_count": len(all_ids),
                "timestamp": now,
            }
        )

        payload = {
            "audit_id": audit_id,
            "task_id": task_id,
            "session_id": self.session_id,
            "using_fallback_storage": self.using_fallback,
            "retrieved_entry_ids": all_ids,
            "semantic_facts": [asdict(e) for e in semantic_facts],
            "procedural_recipes": [asdict(e) for e in procedural_recipes],
            "failure_playbooks": [asdict(e) for e in failure_playbooks],
            "episodic_traces": [asdict(e) for e in episodic_traces],
        }
        payload["compact_guardrails_prompt_block"] = self.build_compact_memory_prompt_block(payload)
        return payload

    def record_failure_lesson(
        self,
        *,
        subject_key: Optional[str] = None,
        module_name: Optional[str] = None,
        error_signature: Optional[str] = None,
        failing_assertion: Optional[str] = None,
        root_cause: str = "",
        minimal_fix_rule: Optional[str] = None,
        minimal_patch_rule: Optional[str] = None,
        source_task_id: Optional[str] = None,
        task_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Records a structured failure-to-repair lesson in Layer 7 (`FAILURE_PATTERNS_AND_PLAYBOOKS`)."""
        subj = (subject_key or module_name or "general").strip()
        err = (error_signature or failing_assertion or "VerificationFailure").strip()
        rule = (minimal_fix_rule or minimal_patch_rule or "").strip()
        src_task = source_task_id or task_id
        sig_short = err.splitlines()[-1][:140] if err else "VerificationFailure"
        content = f"[GUARDRAIL {subj}] Error: {sig_short} | RootCause: {root_cause[:140]} | FixRule: {rule[:160]}"
        entry = self.store(
            layer=7,
            subject_key=f"lesson:{subj}",
            content=content,
            structured_data={
                "subject_key": subj,
                "error_signature": sig_short,
                "root_cause": root_cause[:240],
                "minimal_fix_rule": rule[:240],
            },
            tags=["failure_lesson", "self_improvement", subj],
            source_task_id=src_task,
            supersede_existing_subject=True,
        )
        return {
            "stored": True,
            "entry_id": entry.entry_id,
            "layer": entry.layer_name,
            "subject_key": entry.subject_key,
            "content": content,
            "entry": asdict(entry),
        }

    def build_compact_memory_prompt_block(
        self,
        retrieval_result: Dict[str, Any] | str,
        max_chars: int = 480,
    ) -> str:
        """Builds a <=120-token guardrail block from retrieved Layer 7 failure lessons and Layer 5 facts."""
        if isinstance(retrieval_result, str):
            playbooks = [asdict(e) for e in self.retrieve(query=retrieval_result, layers=[7], limit=3)]
            facts = [asdict(e) for e in self.retrieve(query=retrieval_result, layers=[5], limit=2)]
        else:
            playbooks = retrieval_result.get("failure_playbooks", [])[:3]
            facts = retrieval_result.get("semantic_facts", [])[:2]
        bullets: List[str] = []
        for fb in playbooks:
            c = str(fb.get("content", "")).strip()
            if c:
                bullets.append(f"- LESSON: {c[:165]}")
        for sf in facts:
            c = str(sf.get("content", "")).strip()
            if c:
                bullets.append(f"- FACT: {c[:120]}")
        if not bullets:
            return ""
        joined = "\n".join(bullets)
        header = "LEARNED MEMORY GUARDRAILS (Avoid Repeating Past Failures):\n"
        full = header + joined
        if len(full) > max_chars:
            full = full[: max_chars - 3] + "..."
        return full

    def get_fact_history(self, subject_key: str, layer: int = 5) -> List[MemoryEntry]:
        """Returns the complete chronological supersession chain for a subject_key."""
        with self._lock:
            conn = self._connect()
            try:
                rows = conn.execute(
                    """
                    SELECT * FROM memory_entries
                    WHERE layer = ? AND subject_key = ?
                    ORDER BY created_at ASC
                    """,
                    (layer, subject_key),
                ).fetchall()
                return [self._row_to_entry(r) for r in rows]
            finally:
                conn.close()

    def mark_useful(self, entry_id: str) -> None:
        with self._lock:
            conn = self._connect()
            try:
                with conn:
                    conn.execute(
                        "UPDATE memory_entries SET useful_count = useful_count + 1 WHERE entry_id = ?",
                        (entry_id,),
                    )
            finally:
                conn.close()

    def store_compressed_episode(
        self,
        *,
        subject_key: str,
        raw_observation: str,
        source_task_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        max_chars: int = 600,
    ) -> MemoryEntry:
        compressed = ACONCompressor.compress_observation(raw_observation, max_chars=max_chars)
        return self.store(
            layer=4,
            subject_key=subject_key,
            content=compressed["compressed_text"],
            structured_data=compressed,
            tags=tags or ["episodic", "acon"],
            source_task_id=source_task_id,
            supersede_existing_subject=False,
        )

    def get_retrieval_audits(self, task_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            conn = self._connect()
            try:
                if task_id:
                    rows = conn.execute(
                        "SELECT * FROM retrieval_audit WHERE task_id = ? ORDER BY timestamp ASC",
                        (task_id,),
                    ).fetchall()
                else:
                    rows = conn.execute("SELECT * FROM retrieval_audit ORDER BY timestamp ASC").fetchall()
                return [
                    {
                        "retrieval_id": r["retrieval_id"],
                        "session_id": r["session_id"],
                        "task_id": r["task_id"],
                        "query_text": r["query_text"],
                        "retrieved_entry_ids": json.loads(r["retrieved_entry_ids_json"] or "[]"),
                        "retrieved_count": r["retrieved_count"],
                        "timestamp": r["timestamp"],
                    }
                    for r in rows
                ]
            finally:
                conn.close()

    def _append_audit_jsonl(self, record: Dict[str, Any]) -> None:
        try:
            with open(self.audit_jsonl_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")
        except Exception:
            pass

    @staticmethod
    def _row_to_entry(row: sqlite3.Row) -> MemoryEntry:
        return MemoryEntry(
            entry_id=str(row["entry_id"]),
            layer=int(row["layer"]),
            layer_name=str(row["layer_name"]),
            subject_key=str(row["subject_key"]),
            content=str(row["content"]),
            structured_data=json.loads(row["structured_json"] or "{}"),
            tags=json.loads(row["tags_json"] or "[]"),
            source_task_id=row["source_task_id"],
            session_id=str(row["session_id"]),
            confidence=float(row["confidence"]),
            created_at=float(row["created_at"]),
            updated_at=float(row["updated_at"]),
            expires_at=float(row["expires_at"]) if row["expires_at"] is not None else None,
            access_count=int(row["access_count"]),
            useful_count=int(row["useful_count"]),
            supersedes_id=row["supersedes_id"],
            superseded_by_id=row["superseded_by_id"],
            is_active=bool(row["is_active"]),
        )
