"""
engine/agi17/task_control/task_store.py
AGI 1.7 OMEGA COMMAND — Transactional SQLite WAL Task Store & Append-Only Event Ledger
"""

import contextlib
import json
import os
import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional

from .task_state_machine import TaskState, TaskStateMachine


class TaskStore:
    """Thread-safe transactional SQLite WAL store + append-only JSONL event log."""

    def __init__(
        self,
        db_path: str | Path = r"D:\AGI_Storage\AGI_1_7\state\tasks.db",
        event_log_path: Optional[str | Path] = None,
        events_jsonl_path: Optional[str | Path] = None,
        fallback_dir: Optional[str | Path] = None,
    ):
        self.lock = threading.RLock()
        self.fallback_dir = str(
            fallback_dir
            or os.path.abspath(
                os.path.join(os.path.dirname(__file__), "..", "..", "..", "local_fallback_storage", "state")
            )
        )
        self.db_path = self._resolve_writable_path(str(db_path))
        chosen_log = events_jsonl_path or event_log_path
        self.event_log_path = str(
            chosen_log
            if chosen_log is not None
            else os.path.join(os.path.dirname(self.db_path), "task_events.jsonl")
        )
        self.events_jsonl_path = self.event_log_path
        self._init_db()

    def _resolve_writable_path(self, preferred_path: str) -> str:
        try:
            parent = os.path.dirname(preferred_path)
            os.makedirs(parent, exist_ok=True)
            probe = os.path.join(parent, ".write_test")
            with open(probe, "w", encoding="utf-8") as f:
                f.write("ok")
            os.remove(probe)
            return preferred_path
        except Exception:
            os.makedirs(self.fallback_dir, exist_ok=True)
            return os.path.join(self.fallback_dir, os.path.basename(preferred_path))

    @contextlib.contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path, timeout=15.0, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self.lock:
            with self._connect() as conn:
                conn.executescript(
                    """
                    CREATE TABLE IF NOT EXISTS tasks (
                        task_id TEXT PRIMARY KEY,
                        job_id TEXT NOT NULL,
                        parent_task_id TEXT,
                        campaign_id TEXT,
                        title TEXT NOT NULL,
                        description TEXT,
                        specialist_id TEXT,
                        agi_version TEXT DEFAULT '1.7.0',
                        state TEXT NOT NULL,
                        priority INTEGER DEFAULT 5,
                        idempotency_key TEXT UNIQUE,
                        dependencies_json TEXT DEFAULT '[]',
                        budget_json TEXT DEFAULT '{}',
                        checkpoint_json TEXT DEFAULT '{}',
                        artifact_path TEXT,
                        verification_status TEXT DEFAULT 'PROPOSED',
                        retry_count INTEGER DEFAULT 0,
                        max_retries INTEGER DEFAULT 2,
                        pid INTEGER,
                        exit_code INTEGER,
                        error_detail TEXT,
                        result_json TEXT DEFAULT '{}',
                        created_at REAL NOT NULL,
                        updated_at REAL NOT NULL,
                        started_at REAL,
                        ended_at REAL
                    );

                    CREATE INDEX IF NOT EXISTS idx_tasks_job_id ON tasks(job_id);
                    CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_task_id);
                    CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);

                    CREATE TABLE IF NOT EXISTS command_inbox (
                        event_id TEXT PRIMARY KEY,
                        arrival_ts REAL NOT NULL,
                        session_id TEXT,
                        target_job_id TEXT,
                        raw_instruction TEXT NOT NULL,
                        intent_class TEXT NOT NULL,
                        relationship_to_active TEXT NOT NULL,
                        ack_status TEXT NOT NULL,
                        handling_outcome TEXT NOT NULL,
                        created_task_id TEXT,
                        details_json TEXT DEFAULT '{}',
                        processed_ts REAL
                    );

                    CREATE TABLE IF NOT EXISTS task_events (
                        event_id TEXT PRIMARY KEY,
                        timestamp REAL NOT NULL,
                        task_id TEXT NOT NULL,
                        job_id TEXT NOT NULL,
                        event_type TEXT NOT NULL,
                        from_state TEXT,
                        to_state TEXT,
                        details_json TEXT DEFAULT '{}'
                    );
                    """
                )

    def _append_event(
        self,
        conn: sqlite3.Connection,
        task_id: str,
        job_id: str,
        event_type: str,
        from_state: Optional[str] = None,
        to_state: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        ts = time.time()
        ev_id = f"TEV-{int(ts * 1000)}-{uuid.uuid4().hex[:8]}"
        details_dict = details or {}
        conn.execute(
            """
            INSERT INTO task_events (event_id, timestamp, task_id, job_id, event_type, from_state, to_state, details_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (ev_id, ts, task_id, job_id, event_type, from_state, to_state, json.dumps(details_dict)),
        )
        record = {
            "event_id": ev_id,
            "timestamp": ts,
            "task_id": task_id,
            "job_id": job_id,
            "event_type": event_type,
            "from_state": from_state,
            "to_state": to_state,
            "details": details_dict,
        }
        try:
            os.makedirs(os.path.dirname(self.event_log_path), exist_ok=True)
            with open(self.event_log_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record) + "\n")
        except Exception:
            pass
        return record

    def record_event(self, task_id: str, event_type: str, details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        with self.lock:
            with self._connect() as conn:
                row = conn.execute("SELECT job_id FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
                j_id = row["job_id"] if row else task_id
                return self._append_event(conn, task_id, j_id, event_type, None, None, details)

    def create_task(
        self,
        title: str,
        description: str = "",
        job_id: Optional[str] = None,
        task_id: Optional[str] = None,
        parent_task_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        specialist_id: Optional[str] = None,
        specialist_role: Optional[str] = None,
        priority: int = 5,
        idempotency_key: Optional[str] = None,
        dependencies: Optional[List[str]] = None,
        depends_on: Optional[List[str]] = None,
        budget: Optional[Dict[str, Any]] = None,
        token_budget: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
        delegation_depth: Optional[int] = None,
        max_retries: int = 2,
        initial_state: TaskState = TaskState.CREATED,
    ) -> Dict[str, Any]:
        with self.lock:
            with self._connect() as conn:
                if idempotency_key:
                    row = conn.execute(
                        "SELECT * FROM tasks WHERE idempotency_key = ?", (idempotency_key,)
                    ).fetchone()
                    if row:
                        return self._row_to_dict(row)

                now = time.time()
                t_id = task_id or f"TSK-{int(now * 1000)}-{uuid.uuid4().hex[:6]}"
                j_id = job_id or (parent_task_id if parent_task_id else t_id)
                state_val = TaskStateMachine.normalize(initial_state).value
                spec_val = specialist_role or specialist_id or "plan_mission_decomposer"
                deps_list = list(depends_on if depends_on is not None else (dependencies or []))

                computed_depth = delegation_depth
                if computed_depth is None:
                    if parent_task_id:
                        p_row = conn.execute("SELECT budget_json FROM tasks WHERE task_id = ?", (parent_task_id,)).fetchone()
                        p_budget = json.loads(p_row["budget_json"] or "{}") if p_row else {}
                        computed_depth = int(p_budget.get("delegation_depth", 0)) + 1
                    else:
                        computed_depth = 0

                budget_dict = dict(budget or {})
                if token_budget is not None:
                    budget_dict["token_budget"] = token_budget
                if metadata is not None:
                    budget_dict["metadata"] = metadata
                budget_dict["delegation_depth"] = computed_depth

                conn.execute(
                    """
                    INSERT INTO tasks (
                        task_id, job_id, parent_task_id, campaign_id, title, description,
                        specialist_id, state, priority, idempotency_key, dependencies_json,
                        budget_json, max_retries, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        t_id,
                        j_id,
                        parent_task_id,
                        campaign_id,
                        title,
                        description,
                        spec_val,
                        state_val,
                        priority,
                        idempotency_key,
                        json.dumps(deps_list),
                        json.dumps(budget_dict),
                        max_retries,
                        now,
                        now,
                    ),
                )
                self._append_event(
                    conn,
                    t_id,
                    j_id,
                    "TASK_CREATED",
                    None,
                    state_val,
                    {"title": title, "parent_task_id": parent_task_id, "specialist_id": spec_val},
                )
                row = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (t_id,)).fetchone()
                return self._row_to_dict(row)

    def transition_task(
        self,
        task_id: str,
        next_state: str | TaskState,
        details: Optional[Dict[str, Any]] = None,
        pid: Optional[int] = None,
        exit_code: Optional[int] = None,
        artifact_path: Optional[str] = None,
        verification_status: Optional[str] = None,
        error_detail: Optional[str] = None,
        result_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        with self.lock:
            with self._connect() as conn:
                row = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
                if not row:
                    raise KeyError(f"Task not found: {task_id}")
                curr_state = row["state"]
                validated_next = TaskStateMachine.validate_transition(curr_state, next_state)
                now = time.time()

                started_at = row["started_at"]
                ended_at = row["ended_at"]
                if validated_next == TaskState.RUNNING and not started_at:
                    started_at = now
                if validated_next in {TaskState.SUCCEEDED, TaskState.FAILED, TaskState.TIMED_OUT, TaskState.CANCELED}:
                    ended_at = now

                new_pid = pid if pid is not None else row["pid"]
                new_exit = exit_code if exit_code is not None else row["exit_code"]
                new_art = artifact_path if artifact_path is not None else row["artifact_path"]
                new_ver = verification_status if verification_status is not None else row["verification_status"]
                new_err = error_detail if error_detail is not None else row["error_detail"]
                new_res = json.dumps(result_data) if result_data is not None else row["result_json"]

                conn.execute(
                    """
                    UPDATE tasks
                    SET state = ?, updated_at = ?, started_at = ?, ended_at = ?,
                        pid = ?, exit_code = ?, artifact_path = ?, verification_status = ?,
                        error_detail = ?, result_json = ?
                    WHERE task_id = ?
                    """,
                    (
                        validated_next.value,
                        now,
                        started_at,
                        ended_at,
                        new_pid,
                        new_exit,
                        new_art,
                        new_ver,
                        new_err,
                        new_res,
                        task_id,
                    ),
                )
                self._append_event(
                    conn,
                    task_id,
                    row["job_id"],
                    "STATE_TRANSITION",
                    curr_state,
                    validated_next.value,
                    details or {},
                )
                updated = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
                return self._row_to_dict(updated)

    def update_task_fields(self, task_id: str, **kwargs: Any) -> Dict[str, Any]:
        with self.lock:
            with self._connect() as conn:
                row = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
                if not row:
                    raise KeyError(f"Task not found: {task_id}")

                if "worker_pid" in kwargs:
                    kwargs["pid"] = kwargs.pop("worker_pid")
                if "depends_on" in kwargs:
                    kwargs["dependencies_json"] = kwargs.pop("depends_on")
                if "checkpoint_path" in kwargs:
                    kwargs["artifact_path"] = kwargs.pop("checkpoint_path")
                if "specialist_role" in kwargs:
                    kwargs["specialist_id"] = kwargs.pop("specialist_role")
                if "metadata" in kwargs:
                    b_cur = json.loads(row["budget_json"] or "{}")
                    b_cur["metadata"] = kwargs.pop("metadata")
                    kwargs["budget_json"] = b_cur

                allowed = {
                    "priority",
                    "dependencies_json",
                    "budget_json",
                    "checkpoint_json",
                    "artifact_path",
                    "verification_status",
                    "retry_count",
                    "pid",
                    "exit_code",
                    "error_detail",
                    "result_json",
                    "specialist_id",
                }
                updates = []
                params = []
                for k, v in kwargs.items():
                    if k in allowed:
                        updates.append(f"{k} = ?")
                        params.append(json.dumps(v) if isinstance(v, (dict, list)) else v)
                if updates:
                    updates.append("updated_at = ?")
                    params.append(time.time())
                    params.append(task_id)
                    conn.execute(f"UPDATE tasks SET {', '.join(updates)} WHERE task_id = ?", tuple(params))
                updated = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
                return self._row_to_dict(updated)

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            with self._connect() as conn:
                row = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
                return self._row_to_dict(row) if row else None

    def list_tasks(
        self,
        job_id: Optional[str] = None,
        parent_task_id: Optional[str] = None,
        state: Optional[str | TaskState] = None,
    ) -> List[Dict[str, Any]]:
        with self.lock:
            with self._connect() as conn:
                clauses = []
                params = []
                if job_id:
                    clauses.append("job_id = ?")
                    params.append(job_id)
                if parent_task_id:
                    clauses.append("parent_task_id = ?")
                    params.append(parent_task_id)
                if state:
                    s_val = state.value if isinstance(state, TaskState) else str(state)
                    clauses.append("state = ?")
                    params.append(s_val)
                where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
                rows = conn.execute(
                    f"SELECT * FROM tasks {where} ORDER BY priority DESC, created_at ASC",
                    tuple(params),
                ).fetchall()
                return [self._row_to_dict(r) for r in rows]

    def count_by_state(self) -> Dict[str, int]:
        with self.lock:
            with self._connect() as conn:
                rows = conn.execute("SELECT state, COUNT(*) as cnt FROM tasks GROUP BY state").fetchall()
                return {str(r["state"]): int(r["cnt"]) for r in rows}

    def record_command_event(
        self,
        raw_instruction: str,
        intent_class: str,
        relationship_to_active: str,
        ack_status: str = "ACKNOWLEDGED",
        handling_outcome: str = "QUEUED_FOR_CHECKPOINT",
        session_id: str = "local_session",
        target_job_id: Optional[str] = None,
        created_task_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        processed_ts: Optional[float] = None,
    ) -> Dict[str, Any]:
        with self.lock:
            now = time.time()
            ev_id = f"CMD-{int(now * 1000)}-{uuid.uuid4().hex[:6]}"
            with self._connect() as conn:
                conn.execute(
                    """
                    INSERT INTO command_inbox (
                        event_id, arrival_ts, session_id, target_job_id, raw_instruction,
                        intent_class, relationship_to_active, ack_status, handling_outcome,
                        created_task_id, details_json, processed_ts
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        ev_id,
                        now,
                        session_id,
                        target_job_id,
                        raw_instruction,
                        intent_class,
                        relationship_to_active,
                        ack_status,
                        handling_outcome,
                        created_task_id,
                        json.dumps(details or {}),
                        processed_ts,
                    ),
                )
            return {
                "event_id": ev_id,
                "command_id": ev_id,
                "arrival_ts": now,
                "session_id": session_id,
                "target_job_id": target_job_id,
                "target_task_id": target_job_id,
                "raw_instruction": raw_instruction,
                "intent_class": intent_class,
                "instruction_type": intent_class,
                "relationship_to_active": relationship_to_active,
                "ack_status": ack_status,
                "handling_outcome": handling_outcome,
                "created_task_id": created_task_id,
                "details": details or {},
                "payload": details or {},
            }

    def get_pending_commands(self, target_task_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.lock:
            with self._connect() as conn:
                if target_task_id:
                    rows = conn.execute(
                        "SELECT * FROM command_inbox WHERE (target_job_id = ? OR target_job_id IS NULL) AND processed_ts IS NULL ORDER BY arrival_ts ASC",
                        (target_task_id,),
                    ).fetchall()
                else:
                    rows = conn.execute(
                        "SELECT * FROM command_inbox WHERE processed_ts IS NULL ORDER BY arrival_ts ASC"
                    ).fetchall()
                out = []
                for r in rows:
                    d = dict(r)
                    details = json.loads(d.pop("details_json", "{}") or "{}")
                    d["command_id"] = d["event_id"]
                    d["instruction_type"] = d["intent_class"]
                    d["target_task_id"] = d["target_job_id"]
                    d["details"] = details
                    d["payload"] = details
                    out.append(d)
                return out

    def mark_command_processed(self, command_id: str, outcome: str = "APPLIED_AT_CHECKPOINT") -> None:
        with self.lock:
            with self._connect() as conn:
                conn.execute(
                    "UPDATE command_inbox SET processed_ts = ?, handling_outcome = ? WHERE event_id = ?",
                    (time.time(), outcome, command_id),
                )

    def list_command_events(self, target_job_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.lock:
            with self._connect() as conn:
                if target_job_id:
                    rows = conn.execute(
                        "SELECT * FROM command_inbox WHERE target_job_id = ? ORDER BY arrival_ts ASC",
                        (target_job_id,),
                    ).fetchall()
                else:
                    rows = conn.execute("SELECT * FROM command_inbox ORDER BY arrival_ts ASC").fetchall()
                out = []
                for r in rows:
                    d = dict(r)
                    d["details"] = json.loads(d.pop("details_json", "{}") or "{}")
                    out.append(d)
                return out

    def list_task_events(self, task_id: Optional[str] = None, job_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.lock:
            with self._connect() as conn:
                if task_id:
                    rows = conn.execute(
                        "SELECT * FROM task_events WHERE task_id = ? ORDER BY timestamp ASC", (task_id,)
                    ).fetchall()
                elif job_id:
                    rows = conn.execute(
                        "SELECT * FROM task_events WHERE job_id = ? ORDER BY timestamp ASC", (job_id,)
                    ).fetchall()
                else:
                    rows = conn.execute("SELECT * FROM task_events ORDER BY timestamp ASC").fetchall()
                out = []
                for r in rows:
                    d = dict(r)
                    d["details"] = json.loads(d.pop("details_json", "{}") or "{}")
                    out.append(d)
                return out

    def _row_to_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        deps = json.loads(d.pop("dependencies_json", "[]") or "[]")
        budget = json.loads(d.pop("budget_json", "{}") or "{}")
        checkpoint = json.loads(d.pop("checkpoint_json", "{}") or "{}")
        result = json.loads(d.pop("result_json", "{}") or "{}")

        d["dependencies"] = deps
        d["depends_on"] = deps
        d["budget"] = budget
        d["metadata"] = budget.get("metadata", {})
        d["delegation_depth"] = int(budget.get("delegation_depth", 1 if d.get("parent_task_id") else 0))
        d["checkpoint"] = checkpoint
        d["checkpoint_path"] = d.get("artifact_path") or checkpoint.get("checkpoint_path")
        d["result"] = result
        d["specialist_role"] = d.get("specialist_id")
        d["worker_pid"] = d.get("pid")
        return d
