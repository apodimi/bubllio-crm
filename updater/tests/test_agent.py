from __future__ import annotations

import base64
import json
import socket
import tempfile
import time
import unittest
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from bubllio_update_agent.auth import authenticate_request, sign_request, sign_response
from bubllio_update_agent.api import AgentUnixServer
from bubllio_update_agent.adapters.compose import DockerComposeAdapter
from bubllio_update_agent.config import load_config
from bubllio_update_agent.errors import (
    AdapterError,
    AuthenticationError,
    ConfigurationError,
    ManifestVerificationError,
    RequestValidationError,
)
from bubllio_update_agent.manifest import canonical_manifest_bytes, parse_verified_manifest
from bubllio_update_agent.process_lock import AgentProcessLock
from bubllio_update_agent.release_source import ReleaseMaterial, _AllowlistedRedirect
from bubllio_update_agent.service import UpdateService
from bubllio_update_agent.store import JobState, JobStore
from bubllio_update_agent.verifier import Ed25519Verifier
from bubllio_update_agent.versioning import StableVersion


def manifest(version: str = "0.3.0", policy: str = "online_safe") -> dict[str, object]:
    return {
        "repository": "example/bubllio-crm",
        "version": version,
        "commit_sha": "a" * 40,
        "image_digests": {"backend": f"sha256:{'b' * 64}"},
        "min_version": "0.2.0",
        "max_version": "0.2.9",
        "migration_policy": policy,
        "expected_schema": "crm-0.3",
        "health_timeout_seconds": 30,
        "rollback_compatible": True,
    }


class VersionAndManifestTests(unittest.TestCase):
    def test_only_exact_stable_versions_are_accepted(self) -> None:
        self.assertEqual(str(StableVersion.parse("v1.2.3")), "1.2.3")
        for value in ("1.2", "1.2.3-rc1", "latest", "01.2.3"):
            with self.assertRaises(RequestValidationError):
                StableVersion.parse(value)

    def test_manifest_signature_and_schema_are_verified(self) -> None:
        private_key = Ed25519PrivateKey.generate()
        raw = manifest()
        payload = canonical_manifest_bytes(raw)
        signature = base64.b64encode(private_key.sign(payload))
        public_key = private_key.public_key().public_bytes(
            serialization.Encoding.Raw, serialization.PublicFormat.Raw
        )
        Ed25519Verifier(public_key).verify(payload, signature, StableVersion.parse("0.3.0"))
        parsed = parse_verified_manifest(
            raw,
            "example/bubllio-crm",
            StableVersion.parse("0.3.0"),
            StableVersion.parse("0.2.0"),
        )
        self.assertEqual(parsed.migration_policy, "online_safe")

        changed = {**raw, "repository": "attacker/repository"}
        with self.assertRaises(ManifestVerificationError):
            parse_verified_manifest(
                changed,
                "example/bubllio-crm",
                StableVersion.parse("0.3.0"),
                StableVersion.parse("0.2.0"),
            )


class AuthenticationTests(unittest.TestCase):
    def test_hmac_authentication_binds_method_path_time_and_body(self) -> None:
        secret = b"s" * 32
        installation_id = "00000000-0000-4000-8000-000000000001"
        body = b'{"target_version":"0.3.0"}'
        signature = sign_request(
            secret, "POST", "/v1/preflight", "1000", installation_id, body
        )
        authenticate_request(
            secret=secret,
            method="POST",
            path="/v1/preflight",
            timestamp="1000",
            signature=signature,
            installation_id=installation_id,
            expected_installation_id=installation_id,
            body=body,
            max_age_seconds=60,
            now=1000,
        )
        with self.assertRaises(AuthenticationError):
            authenticate_request(
                secret=secret,
                method="POST",
                path="/v1/updates",
                timestamp="1000",
                signature=signature,
                installation_id=installation_id,
                expected_installation_id=installation_id,
                body=body,
                max_age_seconds=60,
                now=1000,
            )
        with self.assertRaises(AuthenticationError):
            authenticate_request(
                secret=secret,
                method="POST",
                path="/v1/preflight",
                timestamp="1000",
                signature=signature,
                installation_id="00000000-0000-4000-8000-000000000002",
                expected_installation_id=installation_id,
                body=body,
                max_age_seconds=60,
                now=1000,
            )

    def test_response_mac_binds_status_path_time_installation_and_body(self) -> None:
        signature = sign_response(
            b"s" * 32,
            200,
            "/v1/status",
            "1000",
            "00000000-0000-4000-8000-000000000001",
            b'{"status":"ok"}',
        )
        changed = sign_response(
            b"s" * 32,
            200,
            "/v1/status",
            "1000",
            "00000000-0000-4000-8000-000000000002",
            b'{"status":"ok"}',
        )
        self.assertNotEqual(signature, changed)


class ReleaseRedirectTests(unittest.TestCase):
    def test_only_bounded_https_redirects_to_exact_hosts_are_allowed(self) -> None:
        handler = _AllowlistedRedirect(frozenset({"release-assets.githubusercontent.com"}), 1)
        request = urllib.request.Request("https://github.com/example/repo/releases/download/v1/a")
        redirected = handler.redirect_request(
            request,
            None,
            302,
            "Found",
            {},
            "https://release-assets.githubusercontent.com/github-production-release-asset/a",
        )
        self.assertEqual(redirected.host, "release-assets.githubusercontent.com")
        with self.assertRaises(urllib.error.HTTPError) as blocked_host:
            handler.redirect_request(
                request,
                None,
                302,
                "Found",
                {},
                "https://attacker.example/a",
            )
        blocked_host.exception.close()
        with self.assertRaises(urllib.error.HTTPError) as excessive_redirect:
            handler.redirect_request(
                redirected,
                None,
                302,
                "Found",
                {},
                "https://release-assets.githubusercontent.com/second",
            )
        excessive_redirect.exception.close()


class ConfigTests(unittest.TestCase):
    def test_config_rejects_paths_outside_compose_project(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            private_key = Ed25519PrivateKey.generate()
            public = private_key.public_key().public_bytes(
                serialization.Encoding.Raw, serialization.PublicFormat.Raw
            )
            config = {
                "installation_id": "00000000-0000-4000-8000-000000000001",
                "repository": "example/bubllio-crm",
                "current_version": "0.2.0",
                "release_source": {
                    "manifest_url_template": "https://example.test/v{version}/manifest.json",
                    "bundle_url_template": "https://example.test/v{version}/manifest.sigstore",
                    "allowed_redirect_hosts": ["assets.example.test"],
                    "max_redirects": 2,
                },
                "manifest_verifier": {
                    "kind": "ed25519",
                    "public_key": base64.b64encode(public).decode(),
                },
                "state_path": str(root / "state.sqlite3"),
                "provider": {
                    "kind": "docker_compose",
                    "docker_executable": "/usr/bin/docker",
                    "project_directory": str(root / "project"),
                    "compose_files": ["../outside.yaml"],
                    "env_file": ".env",
                    "managed_release_env_file": ".agent/release.env",
                    "release_variable": "BUBLLIO_IMAGE_TAG",
                    "images": {
                        "backend": {
                            "repository": "ghcr.io/example/backend",
                            "environment_variable": "BUBLLIO_BACKEND_IMAGE",
                            "services": ["backend", "worker", "beat"],
                        }
                    },
                    "backup_executable": "/usr/bin/true",
                    "health_url": "http://127.0.0.1:8080/health/",
                },
            }
            path = root / "config.json"
            path.write_text(json.dumps(config), encoding="utf-8")
            with self.assertRaises(ConfigurationError):
                load_config(path, {"BUBLLIO_UPDATE_AGENT_SECRET": "s" * 32})
            config["provider"]["compose_files"] = ["compose.yaml"]
            path.write_text(json.dumps(config), encoding="utf-8")
            loaded = load_config(path, {"BUBLLIO_UPDATE_AGENT_SECRET": "s" * 32})
            self.assertEqual(loaded.repository, "example/bubllio-crm")
            config["provider"]["images"]["backend"]["services"] = ["backend", "backend"]
            path.write_text(json.dumps(config), encoding="utf-8")
            with self.assertRaises(ConfigurationError):
                load_config(path, {"BUBLLIO_UPDATE_AGENT_SECRET": "s" * 32})
            config["provider"]["images"]["backend"]["services"] = ["backend;pull-all"]
            path.write_text(json.dumps(config), encoding="utf-8")
            with self.assertRaises(ConfigurationError):
                load_config(path, {"BUBLLIO_UPDATE_AGENT_SECRET": "s" * 32})


class UnixSocketTests(unittest.TestCase):
    def test_server_creates_private_socket_and_removes_it_on_close(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            socket_path = Path(directory) / "agent.sock"
            config = SimpleNamespace(
                unix_socket_path=socket_path,
                socket_group_gid=None,
            )
            try:
                server = AgentUnixServer(config, object())
            except PermissionError:
                self.skipTest("test sandbox does not permit Unix socket creation")
            try:
                self.assertTrue(socket_path.exists())
                self.assertEqual(socket_path.stat().st_mode & 0o777, 0o660)
            finally:
                server.server_close()
            self.assertFalse(socket_path.exists())

    def test_server_never_replaces_a_regular_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            socket_path = Path(directory) / "agent.sock"
            socket_path.write_text("operator data", encoding="utf-8")
            config = SimpleNamespace(
                unix_socket_path=socket_path,
                socket_group_gid=None,
            )
            with self.assertRaises(OSError):
                AgentUnixServer(config, object())
            self.assertEqual(socket_path.read_text(encoding="utf-8"), "operator data")

    def test_second_server_never_unlinks_a_live_socket(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            socket_path = Path(directory) / "agent.sock"
            config = SimpleNamespace(unix_socket_path=socket_path, socket_group_gid=None)
            try:
                first = AgentUnixServer(config, object())
            except PermissionError:
                self.skipTest("test sandbox does not permit Unix socket creation")
            try:
                with self.assertRaisesRegex(OSError, "already listening"):
                    AgentUnixServer(config, object())
                self.assertTrue(socket_path.exists())
            finally:
                first.server_close()

    def test_server_close_never_unlinks_a_replacement_socket(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            socket_path = Path(directory) / "agent.sock"
            config = SimpleNamespace(unix_socket_path=socket_path, socket_group_gid=None)
            try:
                first = AgentUnixServer(config, object())
            except PermissionError:
                self.skipTest("test sandbox does not permit Unix socket creation")
            replacement = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            try:
                socket_path.unlink()
                replacement.bind(str(socket_path))
                replacement.listen(1)
                first.server_close()
                self.assertTrue(socket_path.exists())
            finally:
                replacement.close()
                try:
                    socket_path.unlink()
                except FileNotFoundError:
                    pass


class ProcessLockTests(unittest.TestCase):
    def test_only_one_live_agent_can_hold_the_state_lock(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "agent.lock"
            first = AgentProcessLock(path)
            second = AgentProcessLock(path)
            first.acquire()
            try:
                with self.assertRaisesRegex(ConfigurationError, "already running"):
                    second.acquire()
            finally:
                first.close()
            second.acquire()
            second.close()


class _Source:
    def __init__(self, raw: dict[str, object], private_key: Ed25519PrivateKey) -> None:
        payload = canonical_manifest_bytes(raw)
        self.material = ReleaseMaterial(raw, payload, base64.b64encode(private_key.sign(payload)))

    def load(self, version: StableVersion) -> ReleaseMaterial:
        return self.material


class _Adapter:
    def __init__(self) -> None:
        self.calls: list[str] = []

    def preflight(self, manifest) -> None:  # noqa: ANN001
        self.calls.append("preflight")

    def backup(self) -> None:
        self.calls.append("backup")

    def deploy(self, manifest) -> None:  # noqa: ANN001
        self.calls.append("deploy")

    def verify(self, manifest) -> None:  # noqa: ANN001
        self.calls.append("verify")


class ServiceTests(unittest.TestCase):
    def test_update_is_persistent_idempotent_and_reaches_success(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            private_key = Ed25519PrivateKey.generate()
            public = private_key.public_key().public_bytes(
                serialization.Encoding.Raw, serialization.PublicFormat.Raw
            )
            config = type(
                "Config",
                (),
                {
                    "repository": "example/bubllio-crm",
                    "installation_id": "00000000-0000-4000-8000-000000000001",
                    "current_version": StableVersion.parse("0.2.0"),
                },
            )()
            store = JobStore(Path(directory) / "state.sqlite3")
            adapter = _Adapter()
            service = UpdateService(
                config,
                store,
                _Source(manifest(), private_key),
                Ed25519Verifier(public),
                adapter,
            )
            job, created = service.start("0.3.0", "request-00000001")
            self.assertTrue(created)
            self.assertEqual(
                job.public_dict()["installation_id"],
                "00000000-0000-4000-8000-000000000001",
            )
            deadline = time.monotonic() + 2
            while time.monotonic() < deadline:
                saved = store.get(job.id)
                if saved and saved.state == JobState.SUCCEEDED:
                    break
                time.sleep(0.01)
            self.assertEqual(store.get(job.id).state, JobState.SUCCEEDED)
            replay, replay_created = service.start("0.3.0", "request-00000001")
            self.assertFalse(replay_created)
            self.assertEqual(replay.id, job.id)
            self.assertEqual(adapter.calls, ["preflight", "preflight", "backup", "deploy", "verify"])


class ComposeVerificationTests(unittest.TestCase):
    @staticmethod
    def _release_manifest():
        return parse_verified_manifest(
            manifest(),
            "example/bubllio-crm",
            StableVersion.parse("0.3.0"),
            StableVersion.parse("0.2.0"),
        )

    @staticmethod
    def _response(payload: dict[str, object]) -> BytesIO:
        response = BytesIO(json.dumps(payload).encode())
        response.status = 200
        return response

    @patch("bubllio_update_agent.adapters.compose.urllib.request.urlopen")
    def test_health_must_match_signed_release_identity(self, open_url) -> None:
        release = self._release_manifest()
        open_url.return_value = self._response(
            {
                "status": "ok",
                "version": "0.3.0",
                "commit_sha": "a" * 40,
                "schema": "crm-0.3",
            }
        )
        adapter = DockerComposeAdapter(SimpleNamespace(health_url="http://127.0.0.1/health/"))
        adapter.verify(release)

    @patch("bubllio_update_agent.adapters.compose.time.sleep")
    @patch("bubllio_update_agent.adapters.compose.time.monotonic", side_effect=[0, 0, 31])
    @patch("bubllio_update_agent.adapters.compose.urllib.request.urlopen")
    def test_health_rejects_wrong_commit(self, open_url, _clock, _sleep) -> None:
        release = self._release_manifest()
        open_url.return_value = self._response(
            {
                "status": "ok",
                "version": "0.3.0",
                "commit_sha": "f" * 40,
                "schema": "crm-0.3",
            }
        )
        adapter = DockerComposeAdapter(SimpleNamespace(health_url="http://127.0.0.1/health/"))
        with self.assertRaises(AdapterError):
            adapter.verify(release)

    @patch("bubllio_update_agent.adapters.compose.subprocess.run")
    def test_deploy_atomically_persists_and_uses_digest_pinned_environment(self, run) -> None:
        run.return_value = SimpleNamespace(returncode=0)
        with tempfile.TemporaryDirectory() as directory:
            project = Path(directory)
            managed = project / ".agent" / "release.env"
            config = SimpleNamespace(
                docker_executable=Path("/usr/bin/docker"),
                project_directory=project,
                compose_files=(project / "compose.yaml",),
                env_file=project / ".env",
                managed_release_env_file=managed,
                release_variable="BUBLLIO_IMAGE_TAG",
                images={
                    "backend": SimpleNamespace(
                        repository="ghcr.io/example/backend",
                        environment_variable="BUBLLIO_BACKEND_IMAGE",
                        services=("backend", "worker", "beat"),
                    )
                },
            )
            with patch.dict(
                "os.environ",
                {
                    "BUBLLIO_IMAGE_TAG": "attacker",
                    "BUBLLIO_BACKEND_IMAGE": "attacker/latest",
                },
                clear=False,
            ):
                DockerComposeAdapter(config).deploy(self._release_manifest())

            self.assertEqual(
                managed.read_text(encoding="utf-8"),
                "BUBLLIO_BACKEND_IMAGE=ghcr.io/example/backend@sha256:"
                + "b" * 64
                + "\nBUBLLIO_IMAGE_TAG=v0.3.0\n",
            )
            self.assertEqual(managed.stat().st_mode & 0o777, 0o640)
            self.assertEqual(run.call_count, 2)
            pull_command = run.call_args_list[0].args[0]
            self.assertEqual(pull_command[-4:], ["pull", "backend", "beat", "worker"])
            self.assertNotIn("postgres", pull_command)
            self.assertNotIn("rabbitmq", pull_command)
            for call in run.call_args_list:
                command = call.args[0]
                self.assertIn(str(managed), command)
                environment = call.kwargs["env"]
                self.assertNotIn("BUBLLIO_IMAGE_TAG", environment)
                self.assertNotIn("BUBLLIO_BACKEND_IMAGE", environment)


if __name__ == "__main__":
    unittest.main()
