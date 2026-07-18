"""Executable contract for the initial database schema and object storage."""

from __future__ import annotations

import io
import tempfile
from pathlib import Path

from sqlalchemy import create_engine, inspect

from app.config import get_settings
from app.storage.filesystem import FilesystemStorage


EXPECTED_TABLES = {
    "profiles",
    "source_documents",
    "parse_runs",
    "profile_facts",
    "jobs",
    "job_requirements",
    "match_results",
    "generated_documents",
    "document_changes",
    "applications",
    "application_events",
    "fill_plans",
    "operations",
    "agent_runs",
}

EXPECTED_FOREIGN_KEYS = {
    "source_documents": {"profile_id"},
    "parse_runs": {"source_document_id", "operation_id"},
    "profile_facts": {"profile_id", "parse_run_id"},
    "job_requirements": {"job_id"},
    "match_results": {"profile_id", "job_id", "operation_id"},
    "generated_documents": {"profile_id", "job_id", "operation_id"},
    "document_changes": {"generated_document_id"},
    "applications": {"profile_id", "job_id", "generated_document_id"},
    "application_events": {"application_id"},
    "fill_plans": {"application_id", "operation_id"},
    "operations": {"profile_id"},
    "agent_runs": {"operation_id"},
}


def assert_schema() -> None:
    inspector = inspect(create_engine(get_settings().database_url))
    tables = set(inspector.get_table_names())
    assert EXPECTED_TABLES <= tables, f"Missing tables: {sorted(EXPECTED_TABLES - tables)}"

    for table, expected_columns in EXPECTED_FOREIGN_KEYS.items():
        actual_columns = {
            column
            for foreign_key in inspector.get_foreign_keys(table)
            for column in foreign_key["constrained_columns"]
        }
        assert expected_columns <= actual_columns, (
            f"Missing foreign keys on {table}: {sorted(expected_columns - actual_columns)}"
        )

    agent_columns = {column["name"] for column in inspector.get_columns("agent_runs")}
    assert {
        "id",
        "operation_id",
        "role",
        "provider",
        "model",
        "prompt_version",
        "input_schema_version",
        "output_schema_version",
        "status",
        "started_at",
        "completed_at",
        "error_code",
    } <= agent_columns
    assert not {"prompt", "credential", "request", "response"} & agent_columns


def assert_filesystem_storage() -> None:
    with tempfile.TemporaryDirectory() as temporary_directory:
        storage = FilesystemStorage(Path(temporary_directory))
        stored = storage.put("profiles/demo/resume.pdf", io.BytesIO(b"fictional resume"))
        assert stored.key == "profiles/demo/resume.pdf"
        assert stored.size == len(b"fictional resume")
        assert len(stored.sha256) == 64
        assert storage.exists(stored.key)
        with storage.open(stored.key) as source:
            assert source.read() == b"fictional resume"
        storage.delete(stored.key)
        assert not storage.exists(stored.key)

        for unsafe_key in ("../secret", "/absolute", "profiles/../../secret"):
            try:
                storage.exists(unsafe_key)
            except ValueError:
                pass
            else:
                raise AssertionError(f"Unsafe key accepted: {unsafe_key}")


if __name__ == "__main__":
    assert_schema()
    assert_filesystem_storage()
    print("Validated initial database schema")
