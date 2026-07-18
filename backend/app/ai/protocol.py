from __future__ import annotations

from typing import Protocol, TypeVar

from pydantic import BaseModel

from app.models.ai import AgentRequest, AgentResult, ProviderInfo


OutputT = TypeVar("OutputT", bound=BaseModel)


class AiProvider(Protocol):
    def info(self, selected_model: str | None = None) -> ProviderInfo: ...

    def run_structured(
        self,
        request: AgentRequest,
        output_type: type[OutputT],
    ) -> AgentResult[OutputT]: ...
