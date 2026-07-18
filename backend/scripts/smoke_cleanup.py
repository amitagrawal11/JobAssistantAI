"""Remove records and artifacts created by executable smoke journeys."""

from __future__ import annotations

import atexit
import shutil
import uuid

from app.config import get_settings
from app.db.entities import Job, Profile
from app.db.session import get_session_factory


_profile_ids: set[uuid.UUID] = set()
_job_ids: set[uuid.UUID] = set()


def register_profile(profile_id: str) -> str:
    _profile_ids.add(uuid.UUID(profile_id))
    return profile_id


def register_job(job_id: str) -> str:
    _job_ids.add(uuid.UUID(job_id))
    return job_id


@atexit.register
def cleanup() -> None:
    if not _profile_ids and not _job_ids:
        return
    with get_session_factory()() as session, session.begin():
        for job_id in _job_ids:
            job = session.get(Job, job_id)
            if job is not None:
                session.delete(job)
        for profile_id in _profile_ids:
            profile = session.get(Profile, profile_id)
            if profile is not None:
                session.delete(profile)
    for profile_id in _profile_ids:
        shutil.rmtree(get_settings().storage_root / "profiles" / str(profile_id), ignore_errors=True)
