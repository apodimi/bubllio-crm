from __future__ import annotations

import json
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from pathlib import Path
from typing import Iterator

from .errors import RequestValidationError, UpdateConflictError


class JobState(StrEnum):
    REQUESTED = "REQUESTED"
    PREFLIGHT = "PREFLIGHT"
    BACKING_UP = "BACKING_UP"
    DEPLOYING = "DEPLOYING"
    VERIFYING = "VERIFYING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    ROLLED_BACK = "ROLLED_BACK"
    MANUAL_INTERVENTION = "MANUAL_INTERVENTION"


ACTIVE_STATES = {
    JobState.REQUESTED,
    JobState.PREFLIGHT,
    JobState.BACKING_UP,
    JobState.DEPLOYING,
    JobState.VERIFYING,
}
TERMINAL_STATES = set(JobState) - ACTIVE_STATES


@dataclass(frozen=True)
class Job:
    id: str
    idempotency_key: str
    installation_id: str
    source_version: str
    target_version: str
    state: JobState
    progress: int
    phase: str
    manifest: dict[str, object]
    error_code: str | None
    error_message: str | None
    created_at: str
    updated_at: str

    def public_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "installation_id": self.installation_id,
            "source_version": self.source_version,
            "target_version": self.target_version,
            "state": self.state,
            "progress": self.progress,
            "phase": self.phase,
            "migration_policy": self.manifest.get("migration_policy"),
            "error": (
                {"code": self.error_code, "message": self.error_message}
                if self.error_code
                else None
            ),
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class JobStore:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = threading.RLock()
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        self._initialize()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self._path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    installation_id TEXT NOT NULL,
                    source_version TEXT NOT NULL,
                    target_version TEXT NOT NULL,
                    state TEXT NOT NULL,
                    progress INTEGER NOT NULL,
                    phase TEXT NOT NULL,
                    manifest_json TEXT NOT NULL,
                    error_code TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS jobs_single_active
                ON jobs ((1))
                WHERE state IN ('REQUESTED', 'PREFLIGHT', 'BACKING_UP', 'DEPLOYING', 'VERIFYING');
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
                    state TEXT NOT NULL,
                    progress INTEGER NOT NULL,
                    phase TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS metadata (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                """
            )
        try:
            self._path.chmod(0o600)
        except OSError:
            pass

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).isoformat()

    @staticmethod
    def _from_row(row: sqlite3.Row) -> Job:
        return Job(
            id=row["id"],
            idempotency_key=row["idempotency_key"],
            installation_id=row["installation_id"],
            source_version=row["source_version"],
            target_version=row["target_version"],
            state=JobState(row["state"]),
            progress=row["progress"],
            phase=row["phase"],
            manifest=json.loads(row["manifest_json"]),
            error_code=row["error_code"],
            error_message=row["error_message"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def current_version(self, configured_version: str) -> str:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT value FROM metadata WHERE key = 'current_version'"
            ).fetchone()
        return row["value"] if row else configured_version

    def set_current_version(self, version: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO metadata(key, value) VALUES ('current_version', ?) "
                "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                (version,),
            )

    def create_job(
        self,
        *,
        idempotency_key: str,
        installation_id: str,
        source_version: str,
        target_version: str,
        manifest: dict[str, object],
    ) -> tuple[Job, bool]:
        now = self._now()
        job_id = str(uuid.uuid4())
        with self._lock, self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                "SELECT * FROM jobs WHERE idempotency_key = ?", (idempotency_key,)
            ).fetchone()
            if existing:
                job = self._from_row(existing)
                if job.target_version != target_version:
                    raise RequestValidationError("Idempotency key was used for another target")
                return job, False
            active = connection.execute(
                "SELECT id FROM jobs WHERE state IN ('REQUESTED', 'PREFLIGHT', 'BACKING_UP', "
                "'DEPLOYING', 'VERIFYING') LIMIT 1"
            ).fetchone()
            if active:
                raise UpdateConflictError("Another update is active")
            try:
                connection.execute(
                    "INSERT INTO jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)",
                    (
                        job_id,
                        idempotency_key,
                        installation_id,
                        source_version,
                        target_version,
                        JobState.REQUESTED,
                        0,
                        "requested",
                        json.dumps(manifest, sort_keys=True, separators=(",", ":")),
                        now,
                        now,
                    ),
                )
                connection.execute(
                    "INSERT INTO events(job_id, state, progress, phase, created_at) "
                    "VALUES (?, ?, 0, 'requested', ?)",
                    (job_id, JobState.REQUESTED, now),
                )
            except sqlite3.IntegrityError as exc:
                raise UpdateConflictError("Another update is active") from exc
            row = connection.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return self._from_row(row), True

    def update(
        self,
        job_id: str,
        state: JobState,
        progress: int,
        phase: str,
        *,
        error_code: str | None = None,
        error_message: str | None = None,
    ) -> Job:
        now = self._now()
        with self._lock, self._connect() as connection:
            connection.execute(
                "UPDATE jobs SET state=?, progress=?, phase=?, error_code=?, error_message=?, "
                "updated_at=? WHERE id=?",
                (state, progress, phase, error_code, error_message, now, job_id),
            )
            connection.execute(
                "INSERT INTO events(job_id, state, progress, phase, created_at) VALUES (?, ?, ?, ?, ?)",
                (job_id, state, progress, phase, now),
            )
            row = connection.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if row is None:
            raise KeyError(job_id)
        return self._from_row(row)

    def get(self, job_id: str) -> Job | None:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return self._from_row(row) if row else None

    def get_by_idempotency_key(self, key: str) -> Job | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM jobs WHERE idempotency_key = ?", (key,)
            ).fetchone()
        return self._from_row(row) if row else None

    def latest(self) -> Job | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
        return self._from_row(row) if row else None

    def recover_interrupted(self) -> int:
        now = self._now()
        placeholders = ",".join("?" for _ in ACTIVE_STATES)
        with self._connect() as connection:
            cursor = connection.execute(
                f"UPDATE jobs SET state=?, progress=100, phase='manual_intervention', "
                "error_code='agent_restarted', error_message='Operator review is required after agent restart.', "
                f"updated_at=? WHERE state IN ({placeholders})",
                (JobState.MANUAL_INTERVENTION, now, *(str(state) for state in ACTIVE_STATES)),
            )
        return cursor.rowcount
