from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.jobs.service import JobAnalysisService
from app.jobs.url_extractor import JobUrlExtractor
from app.models.job import JobAnalyzeRequest, JobAnalyzeResponse, JobUrlExtractRequest, JobUrlExtractResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/analyze", response_model=JobAnalyzeResponse)
def analyze_job(request: JobAnalyzeRequest, session: Session = Depends(get_session)) -> JobAnalyzeResponse:
    return JobAnalysisService(session).analyze(request)


@router.post("/extract-url", response_model=JobUrlExtractResponse)
def extract_job_url(request: JobUrlExtractRequest) -> JobUrlExtractResponse:
    return JobUrlExtractor().extract(request.url)
