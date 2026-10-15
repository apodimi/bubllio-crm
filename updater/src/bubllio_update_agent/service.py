from __future__ import annotations

import re
import threading
import uuid

from .adapters.base import DeploymentAdapter
from .config import AgentConfig
from .errors import AdapterError, AgentError, RequestValidationError
from .manifest import ReleaseManifest, parse_verified_manifest
from .release_source import HttpReleaseSource
from .store import Job, JobState, JobStore
from .verifier import ManifestVerifier
from .versioning import StableVersion


_IDEMPOTENCY_KEY = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$")


class UpdateService:
    def __init__(
        self,
        config: AgentConfig,
        store: JobStore,
        source: HttpReleaseSource,
        verifier: ManifestVerifier,
        adapter: DeploymentAdapter,
    ) -> None:
        self._config = config
        self._store = store
        self._source = source
        self._verifier = verifier
        self._adapter = adapter

    def _current_version(self) -> StableVersion:
        return StableVersion.parse(
            self._store.current_version(str(self._config.current_version))
        )

    def _verified_manifest(self, target: StableVersion) -> tuple[ReleaseManifest, dict[str, object]]:
        material = self._source.load(target)
        self._verifier.verify(material.canonical_bytes, material.bundle, target)
        manifest = parse_verified_manifest(
            material.manifest,
            self._config.repository,
            target,
            self._current_version(),
        )
        return manifest, material.manifest

    def status(self) -> dict[str, object]:
        latest = self._store.latest()
        return {
            "agent_version": "0.1.0",
            "installation_id": self._config.installation_id,
            "repository": self._config.repository,
            "provider": "docker_compose",
            "current_version": str(self._current_version()),
            "latest_job": latest.public_dict() if latest else None,
        }

    def preflight(self, target_version: object) -> dict[str, object]:
        target = StableVersion.parse(target_version)
        manifest, _ = self._verified_manifest(target)
        blockers: list[dict[str, str]] = []
        try:
            self._adapter.preflight(manifest)
        except AdapterError as exc:
            blockers.append({"code": exc.code, "message": str(exc) or exc.public_message})
        return {
            "installation_id": self._config.installation_id,
            "target_version": str(target),
            "commit_sha": manifest.commit_sha,
            "migration_policy": manifest.migration_policy,
            "expected_schema": manifest.expected_schema,
            "rollback_compatible": manifest.rollback_compatible,
            "eligible": not blockers,
            "blockers": blockers,
        }

    def start(self, target_version: object, idempotency_key: object) -> tuple[Job, bool]:
        target = StableVersion.parse(target_version)
        if not isinstance(idempotency_key, str) or not _IDEMPOTENCY_KEY.fullmatch(idempotency_key):
            raise RequestValidationError("idempotency_key is invalid")
        existing = self._store.get_by_idempotency_key(idempotency_key)
        if existing is not None:
            if existing.target_version != str(target):
                raise RequestValidationError("Idempotency key was used for another target")
            return existing, False
        manifest, raw_manifest = self._verified_manifest(target)
        try:
            self._adapter.preflight(manifest)
        except AdapterError as exc:
            raise RequestValidationError(str(exc) or "Update is not eligible") from exc
        job, created = self._store.create_job(
            idempotency_key=idempotency_key,
            installation_id=self._config.installation_id,
            source_version=str(self._current_version()),
            target_version=str(target),
            manifest=raw_manifest,
        )
        if created:
            threading.Thread(
                target=self._run_job,
                args=(job.id, manifest),
                name=f"update-{job.id}",
                daemon=True,
            ).start()
        return job, created

    def get_job(self, job_id: str) -> Job | None:
        try:
            normalized = str(uuid.UUID(job_id))
        except ValueError:
            return None
        return self._store.get(normalized)

    def _run_job(self, job_id: str, manifest: ReleaseManifest) -> None:
        deployment_started = False
        try:
            self._store.update(job_id, JobState.PREFLIGHT, 10, "preflight")
            self._adapter.preflight(manifest)
            self._store.update(job_id, JobState.BACKING_UP, 30, "backing_up")
            self._adapter.backup()
            self._store.update(job_id, JobState.DEPLOYING, 55, "deploying")
            deployment_started = True
            self._adapter.deploy(manifest)
            self._store.update(job_id, JobState.VERIFYING, 85, "verifying")
            self._adapter.verify(manifest)
            self._store.set_current_version(str(manifest.version))
            self._store.update(job_id, JobState.SUCCEEDED, 100, "succeeded")
        except AgentError as exc:
            state = JobState.MANUAL_INTERVENTION if deployment_started else JobState.FAILED
            self._store.update(
                job_id,
                state,
                100,
                state.value.lower(),
                error_code=exc.code,
                error_message=exc.public_message,
            )
        except Exception:
            state = JobState.MANUAL_INTERVENTION if deployment_started else JobState.FAILED
            self._store.update(
                job_id,
                state,
                100,
                state.value.lower(),
                error_code="unexpected_failure",
                error_message="The update agent encountered an unexpected failure.",
            )
