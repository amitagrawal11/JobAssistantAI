from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.models.tailoring import (
    DocumentChangeReviewRequest,
    DocumentChangeReviewResponse,
    DocumentTailorRequest,
    DocumentTailorResponse,
)
from app.tailoring.agent_pipeline import TailoringPipeline

router = APIRouter(tags=["tailoring"])


@router.post("/documents/tailor", response_model=DocumentTailorResponse)
def tailor_documents(request: DocumentTailorRequest, session: Session = Depends(get_session)) -> DocumentTailorResponse:
    return TailoringPipeline(session).tailor(request)


@router.patch("/document-changes/{change_id}", response_model=DocumentChangeReviewResponse)
def review_document_change(
    change_id: str, request: DocumentChangeReviewRequest, session: Session = Depends(get_session)
) -> DocumentChangeReviewResponse:
    change = TailoringPipeline(session).review_change(change_id, request.status)
    return DocumentChangeReviewResponse(id=str(change.id), status=change.status.value)
