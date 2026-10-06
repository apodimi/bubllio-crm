import logging
import re


_SENSITIVE_PATHS = (
    re.compile(r"(/api/v1/invitations/)[^/\s?]+"),
    re.compile(r"(/api/v1/installation-admin-invitations/)[^/\s?]+"),
    re.compile(r"(/api/v1/auth/password-reset/)[^/\s?]+/[^/\s?]+"),
)


def redact_sensitive_paths(value: str) -> str:
    redacted = value
    for pattern in _SENSITIVE_PATHS:
        redacted = pattern.sub(r"\1<redacted>", redacted)
    return redacted


class SensitivePathFilter(logging.Filter):
    """Remove one-time credentials from request paths before they reach logs."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_sensitive_paths(record.getMessage())
        record.args = ()
        return True
