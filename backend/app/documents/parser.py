from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

from app.models.parsed_document import ParsedDocument


@dataclass(frozen=True, slots=True)
class ParserResult:
    parsed_document: ParsedDocument
    lossless: dict[str, Any]


class DocumentParser(Protocol):
    def parse(self, path: Path, document_id: str) -> ParserResult: ...
