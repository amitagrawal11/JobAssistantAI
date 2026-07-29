from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.applications.service import ApplicationTrackingService
from app.db.session import get_session
from app.models.tracked_application import (
    TrackedApplicationCreateRequest,
    TrackedApplicationListResponse,
    TrackedApplicationOutput,
    TrackedApplicationUpdateRequest,
)

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("", response_model=TrackedApplicationListResponse)
def list_applications(
    profile_id: str = Query(..., min_length=1),
    status_filter: str | None = Query(default=None, alias="status"),
    session: Session = Depends(get_session),
) -> TrackedApplicationListResponse:
    return ApplicationTrackingService(session).list(profile_id=profile_id, status=status_filter)


@router.post("", response_model=TrackedApplicationOutput, status_code=status.HTTP_201_CREATED)
def create_application(
    request: TrackedApplicationCreateRequest,
    session: Session = Depends(get_session),
) -> TrackedApplicationOutput:
    return ApplicationTrackingService(session).create(request)


@router.patch("/{application_id}", response_model=TrackedApplicationOutput)
def update_application(
    application_id: str,
    request: TrackedApplicationUpdateRequest,
    session: Session = Depends(get_session),
) -> TrackedApplicationOutput:
    return ApplicationTrackingService(session).update(application_id, request)
