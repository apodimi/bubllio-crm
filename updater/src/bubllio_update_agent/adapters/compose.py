from __future__ import annotations

import json
import os
import stat
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

from ..config import ComposeConfig
from ..errors import AdapterError
from ..manifest import ReleaseManifest


class DockerComposeAdapter:
    """Runs a fixed Compose project; request data can never select commands or paths."""

    def __init__(self, config: ComposeConfig) -> None:
        self._config = config

    def _base_command(self, *, managed_release: bool = False) -> list[str]:
        command = [
            str(self._config.docker_executable),
            "compose",
            "--project-directory",
            str(self._config.project_directory),
            "--env-file",
            str(self._config.env_file),
        ]
        if managed_release:
            command.extend(("--env-file", str(self._config.managed_release_env_file)))
        for compose_file in self._config.compose_files:
            command.extend(("--file", str(compose_file)))
        return command

    def _environment(self, manifest: ReleaseManifest | None = None) -> dict[str, str]:
        environment = dict(os.environ)
        if manifest is None:
            return environment
        if set(manifest.image_digests) != set(self._config.images):
            raise AdapterError("Manifest images do not match configured images")
        environment[self._config.release_variable] = f"v{manifest.version}"
        for name, image in self._config.images.items():
            environment[image.environment_variable] = (
                f"{image.repository}@{manifest.image_digests[name]}"
            )
        return environment

    def _reconciliation_environment(self) -> dict[str, str]:
        environment = dict(os.environ)
        environment.pop(self._config.release_variable, None)
        for image in self._config.images.values():
            environment.pop(image.environment_variable, None)
        return environment

    def _persist_release_environment(self, manifest: ReleaseManifest) -> None:
        values = self._environment(manifest)
        names = [
            self._config.release_variable,
            *(image.environment_variable for image in self._config.images.values()),
        ]
        payload = "".join(f"{name}={values[name]}\n" for name in sorted(names)).encode()
        target = self._config.managed_release_env_file
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o750)
        descriptor, temporary_name = tempfile.mkstemp(prefix=".release-", dir=target.parent)
        temporary = os.fsdecode(temporary_name)
        try:
            os.fchmod(descriptor, 0o640)
            with os.fdopen(descriptor, "wb", closefd=True) as stream:
                descriptor = -1
                stream.write(payload)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, target)
            directory = os.open(target.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
        except Exception:
            if descriptor >= 0:
                os.close(descriptor)
            try:
                os.unlink(temporary)
            except FileNotFoundError:
                pass
            raise

    def _run(self, command: list[str], *, environment: dict[str, str], timeout: int) -> None:
        try:
            result = subprocess.run(
                command,
                cwd=self._config.project_directory,
                env=environment,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=timeout,
                check=False,
            )
        except (OSError, subprocess.SubprocessError) as exc:
            raise AdapterError("Provider command could not run") from exc
        if result.returncode != 0:
            raise AdapterError("Provider command returned a failure")

    def preflight(self, manifest: ReleaseManifest) -> None:
        if manifest.migration_policy != "online_safe":
            raise AdapterError("This release requires an operator-managed maintenance window")
        if not self._config.project_directory.is_dir():
            raise AdapterError("A configured provider path is unavailable")
        files = (self._config.env_file, *self._config.compose_files)
        executables = (self._config.docker_executable, self._config.backup_executable)
        if not all(path.is_file() for path in files) or not all(
            path.is_file() and os.access(path, os.X_OK) for path in executables
        ):
            raise AdapterError("A configured provider path is unavailable")
        managed = self._config.managed_release_env_file
        try:
            managed.parent.mkdir(parents=True, exist_ok=True, mode=0o750)
            existing = managed.lstat()
        except FileNotFoundError:
            existing = None
        except OSError as exc:
            raise AdapterError("The managed release environment is unavailable") from exc
        if not os.access(managed.parent, os.W_OK) or (
            existing is not None
            and (not stat.S_ISREG(existing.st_mode) or existing.st_uid != os.geteuid())
        ):
            raise AdapterError("The managed release environment is not trusted")
        self._run(
            [*self._base_command(), "config", "--quiet"],
            environment=self._environment(manifest),
            timeout=30,
        )

    def backup(self) -> None:
        self._run(
            [str(self._config.backup_executable), *self._config.backup_arguments],
            environment=dict(os.environ),
            timeout=900,
        )

    def deploy(self, manifest: ReleaseManifest) -> None:
        self._persist_release_environment(manifest)
        environment = self._reconciliation_environment()
        command = self._base_command(managed_release=True)
        signed_services = sorted(
            service
            for image in self._config.images.values()
            for service in image.services
        )
        self._run(
            [*command, "pull", *signed_services], environment=environment, timeout=900
        )
        self._run(
            [*command, "up", "--detach", "--remove-orphans"],
            environment=environment,
            timeout=900,
        )

    def verify(self, manifest: ReleaseManifest) -> None:
        deadline = time.monotonic() + manifest.health_timeout_seconds
        request = urllib.request.Request(
            self._config.health_url,
            method="GET",
            headers={"Accept": "application/json", "User-Agent": "bubllio-update-agent/0.1"},
        )
        while time.monotonic() < deadline:
            try:
                with urllib.request.urlopen(request, timeout=5) as response:
                    payload = response.read(8193)
                    if len(payload) > 8192:
                        raise ValueError("Health response is too large")
                    health = json.loads(payload)
                    if (
                        200 <= response.status < 300
                        and isinstance(health, dict)
                        and health.get("status") == "ok"
                        and health.get("version") == str(manifest.version)
                        and health.get("commit_sha") == manifest.commit_sha
                        and health.get("schema") == manifest.expected_schema
                    ):
                        return
            except (
                OSError,
                UnicodeDecodeError,
                ValueError,
                json.JSONDecodeError,
                urllib.error.URLError,
            ):
                pass
            time.sleep(2)
        raise AdapterError("Health verification timed out")
