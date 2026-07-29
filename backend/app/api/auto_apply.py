from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.autoapply.service import AutoApplyService
from app.db.session import get_session
from app.models.auto_apply import (
    AutoApplyEnqueueRequest,
    AutoApplyQueueItemOutput,
    AutoApplyQueueListResponse,
    AutoApplyUpdateRequest,
)

router = APIRouter(prefix="/auto-apply", tags=["auto-apply"])


@router.get("/queue", response_model=AutoApplyQueueListResponse)
def list_queue(
    profile_id: str = Query(..., min_length=1),
    session: Session = Depends(get_session),
) -> AutoApplyQueueListResponse:
    return AutoApplyService(session).list(profile_id=profile_id)


@router.post("/queue", response_model=AutoApplyQueueItemOutput, status_code=status.HTTP_201_CREATED)
def enqueue(
    request: AutoApplyEnqueueRequest,
    session: Session = Depends(get_session),
) -> AutoApplyQueueItemOutput:
    return AutoApplyService(session).enqueue(request)


@router.patch("/queue/{item_id}", response_model=AutoApplyQueueItemOutput)
def update_queue_item(
    item_id: str,
    request: AutoApplyUpdateRequest,
    session: Session = Depends(get_session),
) -> AutoApplyQueueItemOutput:
    return AutoApplyService(session).update(item_id, request)


@router.delete("/queue/{item_id}")
def delete_queue_item(
    item_id: str,
    session: Session = Depends(get_session),
) -> dict[str, bool]:
    AutoApplyService(session).remove(item_id)
    return {"ok": True}
