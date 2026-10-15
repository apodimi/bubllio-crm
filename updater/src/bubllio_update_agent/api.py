from __future__ import annotations

import json
import os
import socket
import stat
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from socketserver import ThreadingMixIn, UnixStreamServer
from typing import Any
from urllib.parse import urlsplit

from .auth import authenticate_request, sign_response
from .config import AgentConfig
from .errors import (
    AgentError,
    AuthenticationError,
    ManifestVerificationError,
    RequestValidationError,
    UpdateConflictError,
)
from .service import UpdateService


_MAX_BODY_BYTES = 64 * 1024


class AgentServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, config: AgentConfig, service: UpdateService) -> None:
        if config.bind_host is None or config.bind_port is None:
            raise ValueError("TCP server requires TCP bind settings")
        self.config = config
        self.service = service
        super().__init__((config.bind_host, config.bind_port), AgentRequestHandler)


class AgentUnixServer(ThreadingMixIn, UnixStreamServer):
    daemon_threads = True

    def __init__(self, config: AgentConfig, service: UpdateService) -> None:
        if config.unix_socket_path is None:
            raise ValueError("Unix server requires unix_socket_path")
        path = config.unix_socket_path
        if not path.parent.is_dir():
            raise OSError("Unix socket parent directory does not exist")
        try:
            existing = path.lstat()
        except FileNotFoundError:
            pass
        else:
            if not stat.S_ISSOCK(existing.st_mode) or existing.st_uid != os.geteuid():
                raise OSError("Refusing to replace a non-socket or differently owned path")
            probe = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            try:
                probe.settimeout(0.25)
                probe.connect(str(path))
            except ConnectionRefusedError:
                pass
            except FileNotFoundError:
                pass
            except OSError as exc:
                raise OSError("Refusing to replace an unverified Unix socket") from exc
            else:
                raise OSError("Another update agent is already listening on the Unix socket")
            finally:
                probe.close()
            path.unlink()
        self.config = config
        self.service = service
        self._socket_path = path
        super().__init__(str(path), AgentRequestHandler)
        bound = path.lstat()
        self._socket_identity = (bound.st_dev, bound.st_ino)
        try:
            os.chmod(path, 0o660, follow_symlinks=False)
            if config.socket_group_gid is not None:
                os.chown(path, -1, config.socket_group_gid, follow_symlinks=False)
        except OSError:
            self.server_close()
            raise

    def server_close(self) -> None:
        super().server_close()
        try:
            existing = self._socket_path.lstat()
        except FileNotFoundError:
            return
        if (
            stat.S_ISSOCK(existing.st_mode)
            and existing.st_uid == os.geteuid()
            and (existing.st_dev, existing.st_ino) == self._socket_identity
        ):
            self._socket_path.unlink()


class AgentRequestHandler(BaseHTTPRequestHandler):
    server: AgentServer | AgentUnixServer
    protocol_version = "HTTP/1.1"

    def address_string(self) -> str:
        return "local"

    def log_message(self, format: str, *args: object) -> None:
        # Do not log request bodies, signatures, or provider details.
        super().log_message(format, *args)

    def _send(self, status: int, payload: dict[str, object]) -> None:
        payload = {**payload, "installation_id": self.server.config.installation_id}
        body = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header(
            "X-Bubllio-Response-Signature",
            sign_response(
                self.server.config.shared_secret,
                status,
                self.path,
                self.headers.get("X-Bubllio-Timestamp", ""),
                self.server.config.installation_id,
                body,
            ),
        )
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> bytes:
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError as exc:
            raise RequestValidationError("Content-Length is invalid") from exc
        if size < 0 or size > _MAX_BODY_BYTES:
            raise RequestValidationError("Request body is too large")
        return self.rfile.read(size)

    @staticmethod
    def _json(body: bytes, expected_keys: set[str]) -> dict[str, Any]:
        try:
            value = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise RequestValidationError("Request body is not valid JSON") from exc
        if not isinstance(value, dict) or set(value) != expected_keys:
            raise RequestValidationError("Request fields do not match the endpoint schema")
        return value

    def _authenticate(self, body: bytes) -> None:
        authenticate_request(
            secret=self.server.config.shared_secret,
            method=self.command,
            path=self.path,
            timestamp=self.headers.get("X-Bubllio-Timestamp"),
            signature=self.headers.get("X-Bubllio-Signature"),
            installation_id=self.headers.get("X-Bubllio-Installation-Id"),
            expected_installation_id=self.server.config.installation_id,
            body=body,
            max_age_seconds=self.server.config.request_max_age_seconds,
        )

    def _dispatch(self) -> None:
        parsed = urlsplit(self.path)
        if parsed.query or parsed.fragment:
            raise RequestValidationError("Query parameters are not supported")
        body = self._body() if self.command == "POST" else b""
        self._authenticate(body)

        if self.command == "GET" and parsed.path == "/v1/status":
            self._send(200, self.server.service.status())
            return
        if self.command == "POST" and parsed.path == "/v1/preflight":
            payload = self._json(body, {"target_version"})
            self._send(200, self.server.service.preflight(payload["target_version"]))
            return
        if self.command == "POST" and parsed.path == "/v1/updates":
            payload = self._json(body, {"target_version", "idempotency_key"})
            job, created = self.server.service.start(
                payload["target_version"], payload["idempotency_key"]
            )
            self._send(202 if created else 200, job.public_dict())
            return
        prefix = "/v1/updates/"
        if self.command == "GET" and parsed.path.startswith(prefix):
            job = self.server.service.get_job(parsed.path.removeprefix(prefix))
            if job is None:
                self._send(404, {"error": {"code": "not_found", "message": "Update not found."}})
            else:
                self._send(200, job.public_dict())
            return
        self._send(404, {"error": {"code": "not_found", "message": "Endpoint not found."}})

    def _handle(self) -> None:
        try:
            self._dispatch()
        except AuthenticationError as exc:
            self._send(401, {"error": {"code": exc.code, "message": exc.public_message}})
        except UpdateConflictError as exc:
            self._send(409, {"error": {"code": exc.code, "message": exc.public_message}})
        except (RequestValidationError, ManifestVerificationError) as exc:
            self._send(400, {"error": {"code": exc.code, "message": exc.public_message}})
        except AgentError as exc:
            self._send(503, {"error": {"code": exc.code, "message": exc.public_message}})
        except Exception:
            self._send(
                500,
                {
                    "error": {
                        "code": "unexpected_failure",
                        "message": "The update agent encountered an unexpected failure.",
                    }
                },
            )

    do_GET = _handle
    do_POST = _handle

