"""enable_pg_trgm_and_index_ad_sets

Revision ID: ea1c3a5b9c21
Revises: f3e2b1c4a5d6
Create Date: 2025-07-11 12:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'ea1c3a5b9c21'
down_revision: Union[str, None] = 'f3e2b1c4a5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pg_trgm extension (safe if already enabled)
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    # Create GIN index on content_signature using pg_trgm for similarity search
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_ad_sets_content_signature_gin "
        "ON ad_sets USING gin (content_signature gin_trgm_ops);"
    )


def downgrade() -> None:
    # Drop the GIN index
    op.execute("DROP INDEX IF EXISTS ix_ad_sets_content_signature_gin;")
    # Optionally keep pg_trgm extension (safe); do not drop to avoid affecting other objects 