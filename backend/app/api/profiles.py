from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.errors import DomainError
from app.models.profile import (
    FactVerificationRequest,
    ProfileCreate,
    ProfileResponse,
    ProfileUpdate,
)
from app.profiles.service import ProfileService


router = APIRouter(prefix="/profiles", tags=["profiles"])


def profile_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as error:
        raise DomainError(
            status_code=422,
            code="INVALID_IDENTIFIER",
            message="profile_id must be a valid UUID.",
        ) from error


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    request: ProfileCreate, session: Session = Depends(get_session)
) -> ProfileResponse:
    return ProfileService(session).create(request)


@router.get("", response_model=list[ProfileResponse])
def list_profiles(session: Session = Depends(get_session)) -> list[ProfileResponse]:
    return ProfileService(session).list()


@router.get("/{profile_id_value}", response_model=ProfileResponse)
def get_profile(
    profile_id_value: str, session: Session = Depends(get_session)
) -> ProfileResponse:
    return ProfileService(session).get(profile_id(profile_id_value))


@router.patch("/{profile_id_value}", response_model=ProfileResponse)
def update_profile(
    profile_id_value: str,
    request: ProfileUpdate,
    session: Session = Depends(get_session),
) -> ProfileResponse:
    return ProfileService(session).update(profile_id(profile_id_value), request)


@router.post("/{profile_id_value}/facts/verify", response_model=ProfileResponse)
def verify_profile_facts(
    profile_id_value: str,
    request: FactVerificationRequest,
    session: Session = Depends(get_session),
) -> ProfileResponse:
    return ProfileService(session).verify_facts(profile_id(profile_id_value), request)
