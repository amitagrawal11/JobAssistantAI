from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_session
from app.errors import DomainError
from app.models.profile import (
    FactCreateRequest,
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


@router.post("/{profile_id_value}/default", response_model=ProfileResponse)
def set_default_profile(
    profile_id_value: str, session: Session = Depends(get_session)
) -> ProfileResponse:
    return ProfileService(session).set_default(profile_id(profile_id_value))


@router.delete("/{profile_id_value}")
def delete_profile(
    profile_id_value: str, session: Session = Depends(get_session)
) -> dict[str, bool]:
    ProfileService(session).delete(profile_id(profile_id_value))
    return {"deleted": True}


@router.post("/{profile_id_value}/facts/verify", response_model=ProfileResponse)
def verify_profile_facts(
    profile_id_value: str,
    request: FactVerificationRequest,
    session: Session = Depends(get_session),
) -> ProfileResponse:
    return ProfileService(session).verify_facts(profile_id(profile_id_value), request)


@router.post("/{profile_id_value}/facts", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def add_profile_fact(
    profile_id_value: str,
    request: FactCreateRequest,
    session: Session = Depends(get_session),
) -> ProfileResponse:
    return ProfileService(session).add_fact(profile_id(profile_id_value), request)


@router.delete("/{profile_id_value}/facts/{fact_id_value}", response_model=ProfileResponse)
def delete_profile_fact(
    profile_id_value: str,
    fact_id_value: str,
    session: Session = Depends(get_session),
) -> ProfileResponse:
    return ProfileService(session).delete_fact(profile_id(profile_id_value), profile_id(fact_id_value))
