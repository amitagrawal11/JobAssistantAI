"""backfill_clean_fact_values

One-time cleanup of profile_fact values that were stored before the extractor
sanitizer removed empty/punctuation-only citation brackets ("[ ]", "[, ' ']"),
leaked element-id references, and space-before-punctuation. Applies the same
cleaning as ai_extractor.validate_extracted_facts to every existing row so
stored data matches what new extractions produce (kept self-contained — the
regexes are inlined rather than imported from app code that may change).

Revision ID: 0010
Revises: 0009
Create Date: 2026-07-25 00:00:00.000000
"""
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0010'
down_revision: Union[str, Sequence[str], None] = '0009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_ELEMENT_IDS = re.compile(r"\s*\(?\s*element[_ ]?ids?\s*:?\s*\[?[^)\]]*\]?\)?", re.IGNORECASE)
_TEXTS_REF = re.compile(r"\s*\(?\s*#/texts/\d+\s*\)?")
_EMPTY_BRACKETS = re.compile(r"\[[\s,;:.'\"“”‘’·|-]*\]")
_EMPTY_PARENS = re.compile(r"\(\s*\)")
_SPACE_BEFORE_PUNCT = re.compile(r"\s+([.,;:])")


def _clean(value: str) -> str:
    v = _ELEMENT_IDS.sub(" ", value)
    v = _TEXTS_REF.sub(" ", v)
    v = _EMPTY_BRACKETS.sub(" ", v)
    v = _EMPTY_PARENS.sub(" ", v)
    v = " ".join(v.split())
    v = _SPACE_BEFORE_PUNCT.sub(r"\1", v)
    return v


def upgrade() -> None:
    bind = op.get_bind()
    facts = sa.table("profile_facts", sa.column("id", sa.dialects.postgresql.UUID), sa.column("fact_value", sa.Text))
    rows = bind.execute(sa.select(facts.c.id, facts.c.fact_value)).fetchall()
    for fact_id, value in rows:
        if value is None:
            continue
        cleaned = _clean(value)
        if cleaned and cleaned != value:
            bind.execute(
                sa.update(facts).where(facts.c.id == fact_id).values(fact_value=cleaned)
            )


def downgrade() -> None:
    # Data cleanup is not reversible.
    pass
