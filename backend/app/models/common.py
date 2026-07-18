from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class SourceReference(ApiModel):
    document_id: str
    page: int | None
    bounding_box: list[float]
    element_ids: list[str]
