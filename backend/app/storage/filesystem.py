from __future__ import annotations

import hashlib
import os
import tempfile
from pathlib import Path, PurePosixPath
from typing import BinaryIO

from app.storage.protocol import StoredObject


class FilesystemStorage:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        normalized = PurePosixPath(key)
        if (
            not key
            or normalized.is_absolute()
            or ".." in normalized.parts
            or "\\" in key
            or str(normalized) != key
        ):
            raise ValueError("Storage key must be a normalized relative path")
        target = (self.root / Path(*normalized.parts)).resolve()
        if not target.is_relative_to(self.root):
            raise ValueError("Storage key escapes the configured root")
        return target

    def put(self, key: str, source: BinaryIO) -> StoredObject:
        target = self._resolve(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256()
        size = 0
        temporary_name: str | None = None
        try:
            with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as temporary:
                temporary_name = temporary.name
                while chunk := source.read(1024 * 1024):
                    digest.update(chunk)
                    size += len(chunk)
                    temporary.write(chunk)
                temporary.flush()
                os.fsync(temporary.fileno())
            os.replace(temporary_name, target)
        finally:
            if temporary_name and Path(temporary_name).exists():
                Path(temporary_name).unlink()
        return StoredObject(key=key, size=size, sha256=digest.hexdigest())

    def open(self, key: str) -> BinaryIO:
        return self._resolve(key).open("rb")

    def delete(self, key: str) -> None:
        target = self._resolve(key)
        if target.exists():
            target.unlink()
        self._remove_empty_parents(target.parent)

    def exists(self, key: str) -> bool:
        return self._resolve(key).is_file()

    def _remove_empty_parents(self, directory: Path) -> None:
        while directory != self.root:
            try:
                directory.rmdir()
            except OSError:
                break
            directory = directory.parent
