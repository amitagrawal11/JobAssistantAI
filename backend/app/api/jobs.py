from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.jobs.service import JobAnalysisService
from app.models.job import JobAnalyzeRequest, JobAnalyzeResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/analyze", response_model=JobAnalyzeResponse)
def analyze_job(request: JobAnalyzeRequest, session: Session = Depends(get_session)) -> JobAnalyzeResponse:
    return JobAnalysisService(session).analyze(request)
