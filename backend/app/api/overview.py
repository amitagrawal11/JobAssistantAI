from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.models.overview import OverviewResponse
from app.overview.service import OverviewService

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("", response_model=OverviewResponse)
def get_overview(
    profile_id: str = Query(..., min_length=1),
    session: Session = Depends(get_session),
) -> OverviewResponse:
    return OverviewService(session).get(profile_id=profile_id)
