import hashlib
import hmac
import http.client
import json
import re
import socket
import time
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from django.conf import settings


AGENT_JOB_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
MAX_RESPONSE_BYTES = 262144


class UnixHTTPConnection(http.client.HTTPConnection):
    """HTTP/1.1 over one operator-configured Unix-domain socket."""

    def __init__(self, socket_path, *, timeout):
        super().__init__("localhost", timeout=timeout)
        self.socket_path = socket_path

    def connect(self):
        connection = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        connection.settimeout(self.timeout)
        try:
            connection.connect(self.socket_path)
        except BaseException:
            connection.close()
            raise
        self.sock = connection


class RejectRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        return None


class UpdateAgentError(Exception):
    """A safe-to-handle failure while communicating with the update agent."""


class UpdateAgentUnavailable(UpdateAgentError):
    pass


class UpdateAgentRejected(UpdateAgentError):
    pass


def agent_is_configured():
    base_configured = bool(
        settings.BUBLLIO_UPDATE_AGENT_ENABLED
        and (settings.BUBLLIO_UPDATE_AGENT_SOCKET or settings.BUBLLIO_UPDATE_AGENT_URL)
        and settings.BUBLLIO_UPDATE_AGENT_INSTALLATION_ID
        and len(settings.BUBLLIO_UPDATE_AGENT_SECRET.encode("utf-8")) >= 32
    )
    if not base_configured:
        return False
    try:
        _installation_id()
    except UpdateAgentUnavailable:
        return False
    return True


def _installation_id():
    configured = settings.BUBLLIO_UPDATE_AGENT_INSTALLATION_ID.strip()
    try:
        parsed = uuid.UUID(configured)
    except (AttributeError, ValueError):
        raise UpdateAgentUnavailable from None
    canonical = str(parsed)
    if configured != canonical:
        raise UpdateAgentUnavailable
    return canonical


def _socket_path():
    configured = settings.BUBLLIO_UPDATE_AGENT_SOCKET.strip()
    if not configured:
        return None
    path = Path(configured)
    if not path.is_absolute() or "\x00" in configured or len(configured.encode("utf-8")) > 100:
        raise UpdateAgentUnavailable
    return configured


def _base_url():
    configured = settings.BUBLLIO_UPDATE_AGENT_URL.strip().rstrip("/")
    parsed = urlsplit(configured)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
        raise UpdateAgentUnavailable
    if (
        parsed.scheme == "http"
        and parsed.hostname not in {"127.0.0.1", "::1", "localhost"}
        and not settings.BUBLLIO_UPDATE_AGENT_ALLOW_INSECURE_HTTP
    ):
        raise UpdateAgentUnavailable
    if parsed.path not in {"", "/"} or parsed.query or parsed.fragment:
        raise UpdateAgentUnavailable
    return urlunsplit((parsed.scheme, parsed.netloc, "", "", ""))


def _request(method, path, payload=None):
    if not agent_is_configured():
        raise UpdateAgentUnavailable

    body = b""
    if payload is not None:
        body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    timestamp = str(int(time.time()))
    installation_id = _installation_id()
    body_digest = hashlib.sha256(body).hexdigest()
    signing_input = (
        f"{method}\n{path}\n{timestamp}\n{installation_id}\n{body_digest}"
    ).encode("utf-8")
    signature = hmac.new(
        settings.BUBLLIO_UPDATE_AGENT_SECRET.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).hexdigest()
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Bubllio-CRM-Update-Center",
        "X-Bubllio-Timestamp": timestamp,
        "X-Bubllio-Installation-Id": installation_id,
        "X-Bubllio-Signature": signature,
    }
    response_status = None
    response_signature = None
    raw = b""
    try:
        socket_path = _socket_path()
        if socket_path:
            connection = UnixHTTPConnection(
                socket_path,
                timeout=settings.BUBLLIO_UPDATE_AGENT_TIMEOUT,
            )
            try:
                connection.request(method, path, body=body if payload is not None else None, headers=headers)
                response = connection.getresponse()
                response_status = response.status
                response_signature = response.getheader("X-Bubllio-Response-Signature")
                raw = response.read(MAX_RESPONSE_BYTES + 1)
            finally:
                connection.close()
        else:
            request = Request(
                f"{_base_url()}{path}",
                data=body if payload is not None else None,
                method=method,
                headers=headers,
            )
            opener = build_opener(RejectRedirectHandler())
            with opener.open(request, timeout=settings.BUBLLIO_UPDATE_AGENT_TIMEOUT) as response:
                response_status = response.status
                response_signature = response.headers.get("X-Bubllio-Response-Signature")
                raw = response.read(MAX_RESPONSE_BYTES + 1)
    except HTTPError as exc:
        response_status = exc.code
        response_signature = exc.headers.get("X-Bubllio-Response-Signature")
        try:
            raw = exc.read(MAX_RESPONSE_BYTES + 1)
        except OSError:
            raise UpdateAgentUnavailable from None
    except (http.client.HTTPException, OSError, TimeoutError, URLError, ValueError):
        raise UpdateAgentUnavailable from None
    if len(raw) > MAX_RESPONSE_BYTES:
        raise UpdateAgentUnavailable
    if response_status is not None and 300 <= response_status < 400:
        raise UpdateAgentUnavailable
    response_digest = hashlib.sha256(raw).hexdigest()
    response_signing_input = (
        f"{response_status}\n{path}\n{timestamp}\n{installation_id}\n{response_digest}"
    ).encode("utf-8")
    expected_response_signature = hmac.new(
        settings.BUBLLIO_UPDATE_AGENT_SECRET.encode("utf-8"),
        response_signing_input,
        hashlib.sha256,
    ).hexdigest()
    if not isinstance(response_signature, str) or not hmac.compare_digest(
        expected_response_signature,
        response_signature,
    ):
        raise UpdateAgentRejected
    try:
        decoded = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise UpdateAgentUnavailable from None
    if not isinstance(decoded, dict):
        raise UpdateAgentUnavailable
    if decoded.get("installation_id") != installation_id:
        raise UpdateAgentRejected
    if response_status is None or response_status < 200 or response_status >= 300:
        if response_status is not None and 400 <= response_status < 500:
            raise UpdateAgentRejected
        raise UpdateAgentUnavailable
    return decoded


def get_agent_status():
    return _request("GET", "/v1/status")


def request_preflight(target_version):
    return _request("POST", "/v1/preflight", {"target_version": target_version})


def start_agent_update(target_version, idempotency_key):
    return _request(
        "POST",
        "/v1/updates",
        {"idempotency_key": idempotency_key, "target_version": target_version},
    )


def get_agent_update(agent_job_id):
    if not isinstance(agent_job_id, str) or AGENT_JOB_ID_PATTERN.fullmatch(agent_job_id) is None:
        raise UpdateAgentUnavailable
    return _request("GET", f"/v1/updates/{agent_job_id}")
