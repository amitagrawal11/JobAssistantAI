from __future__ import annotations

import uuid
from typing import Generic, TypeVar

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.entities import Operation, Profile


Entity = TypeVar("Entity", bound=Base)


class Repository(Generic[Entity]):
    def __init__(self, session: Session, entity_type: type[Entity]) -> None:
        self.session = session
        self.entity_type = entity_type

    def add(self, entity: Entity) -> Entity:
        self.session.add(entity)
        self.session.flush()
        return entity

    def get(self, entity_id: uuid.UUID) -> Entity | None:
        return self.session.get(self.entity_type, entity_id)

    def list(self) -> list[Entity]:
        return list(self.session.scalars(select(self.entity_type)))


class ProfileRepository(Repository[Profile]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Profile)


class OperationRepository(Repository[Operation]):
    def __init__(self, session: Session) -> None:
        super().__init__(session, Operation)
