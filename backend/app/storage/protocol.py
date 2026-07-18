from __future__ import annotations

from dataclasses import dataclass
from typing import BinaryIO, Protocol


@dataclass(frozen=True, slots=True)
class StoredObject:
    key: str
    size: int
    sha256: str


class ObjectStorage(Protocol):
    def put(self, key: str, source: BinaryIO) -> StoredObject: ...

    def open(self, key: str) -> BinaryIO: ...

    def delete(self, key: str) -> None: ...

    def exists(self, key: str) -> bool: ...
