from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.models.tailoring import (
    DocumentChangeReviewRequest,
    DocumentChangeReviewResponse,
    DocumentTailorRequest,
    DocumentTailorResponse,
    GeneratedResumeResponse,
)
from app.tailoring.agent_pipeline import TailoringPipeline
from app.tailoring.pdf_renderer import TailoredResumePdfRenderer, pdf_filename

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


@router.get("/generated-documents/{document_id}", response_model=GeneratedResumeResponse)
def get_generated_resume(document_id: str, session: Session = Depends(get_session)) -> GeneratedResumeResponse:
    return TailoringPipeline(session).generated_resume(document_id)


@router.get("/generated-documents/{document_id}/pdf")
def download_generated_resume(document_id: str, session: Session = Depends(get_session)) -> Response:
    generated = TailoringPipeline(session).generated_resume(document_id)
    content = TailoredResumePdfRenderer().render_pdf(generated.current, generated.title, generated.company)
    filename = pdf_filename(generated.current.name, generated.company, generated.title)
    return Response(
        content=content, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
