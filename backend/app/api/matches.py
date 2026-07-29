from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.session import get_session
from app.models.match import MatchScoreRequest, MatchScoreResponse
from app.scoring.agent_pipeline import MatchScoringPipeline
from app.storage.filesystem import FilesystemStorage

router = APIRouter(prefix="/matches", tags=["matches"])

@router.post("/score", response_model=MatchScoreResponse)
def score_match(request: MatchScoreRequest, session: Session = Depends(get_session)) -> MatchScoreResponse:
    storage = FilesystemStorage(get_settings().storage_root)
    return MatchScoringPipeline(session, storage).score(request)
