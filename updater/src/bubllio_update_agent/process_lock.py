from __future__ import annotations

import fcntl
import os
import stat
from pathlib import Path

from .errors import ConfigurationError


class AgentProcessLock:
    """Lifetime advisory lock preventing concurrent agents for one state directory."""

    def __init__(self, path: Path) -> None:
        self._path = path
        self._descriptor: int | None = None

    def acquire(self) -> None:
        if self._descriptor is not None:
            return
        self._path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_CLOEXEC", 0)
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        try:
            descriptor = os.open(self._path, flags, 0o600)
        except OSError as exc:
            raise ConfigurationError("Cannot open the update agent process lock") from exc
        try:
            details = os.fstat(descriptor)
            if not stat.S_ISREG(details.st_mode) or details.st_uid != os.geteuid():
                raise ConfigurationError("The update agent process lock is not a trusted file")
            os.fchmod(descriptor, 0o600)
            try:
                fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as exc:
                raise ConfigurationError("Another update agent process is already running") from exc
            os.ftruncate(descriptor, 0)
            os.write(descriptor, f"{os.getpid()}\n".encode())
            os.fsync(descriptor)
        except Exception:
            os.close(descriptor)
            raise
        self._descriptor = descriptor

    def close(self) -> None:
        if self._descriptor is None:
            return
        try:
            fcntl.flock(self._descriptor, fcntl.LOCK_UN)
        finally:
            os.close(self._descriptor)
            self._descriptor = None

    def __enter__(self) -> "AgentProcessLock":
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:  # noqa: ANN001
        self.close()

