import re
from dataclasses import dataclass

from .errors import RequestValidationError


_STABLE_VERSION = re.compile(r"^(?:v)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


@dataclass(frozen=True, order=True)
class StableVersion:
    major: int
    minor: int
    patch: int

    @classmethod
    def parse(cls, value: object) -> "StableVersion":
        if not isinstance(value, str):
            raise RequestValidationError("Version must be a string")
        match = _STABLE_VERSION.fullmatch(value)
        if not match:
            raise RequestValidationError("Only exact stable semantic versions are accepted")
        return cls(*(int(part) for part in match.groups()))

    def __str__(self) -> str:
        return f"{self.major}.{self.minor}.{self.patch}"

