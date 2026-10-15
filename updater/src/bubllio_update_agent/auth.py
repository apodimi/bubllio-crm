from __future__ import annotations

import hashlib
import hmac
import time

from .errors import AuthenticationError


def signature_payload(
    method: str, path: str, timestamp: str, installation_id: str, body: bytes
) -> bytes:
    body_hash = hashlib.sha256(body).hexdigest()
    return (
        f"{method.upper()}\n{path}\n{timestamp}\n{installation_id}\n{body_hash}".encode()
    )


def sign_request(
    secret: bytes,
    method: str,
    path: str,
    timestamp: str,
    installation_id: str,
    body: bytes,
) -> str:
    return hmac.new(
        secret,
        signature_payload(method, path, timestamp, installation_id, body),
        hashlib.sha256,
    ).hexdigest()


def sign_response(
    secret: bytes,
    status: int,
    path: str,
    request_timestamp: str,
    installation_id: str,
    body: bytes,
) -> str:
    body_hash = hashlib.sha256(body).hexdigest()
    payload = (
        f"{status}\n{path}\n{request_timestamp}\n{installation_id}\n{body_hash}".encode()
    )
    return hmac.new(secret, payload, hashlib.sha256).hexdigest()


def authenticate_request(
    *,
    secret: bytes,
    method: str,
    path: str,
    timestamp: str | None,
    signature: str | None,
    installation_id: str | None,
    expected_installation_id: str,
    body: bytes,
    max_age_seconds: int,
    now: int | None = None,
) -> None:
    try:
        request_time = int(timestamp or "")
    except ValueError as exc:
        raise AuthenticationError("Timestamp is invalid") from exc
    current_time = int(time.time()) if now is None else now
    if abs(current_time - request_time) > max_age_seconds:
        raise AuthenticationError("Timestamp is outside the allowed window")
    if not isinstance(installation_id, str) or not hmac.compare_digest(
        expected_installation_id, installation_id
    ):
        raise AuthenticationError("Installation identity is invalid")
    expected = sign_request(
        secret, method, path, str(request_time), expected_installation_id, body
    )
    if not isinstance(signature, str) or not hmac.compare_digest(expected, signature):
        raise AuthenticationError("Signature is invalid")

