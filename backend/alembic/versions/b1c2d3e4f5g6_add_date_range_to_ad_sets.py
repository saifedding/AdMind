"""add_date_range_to_ad_sets

Revision ID: b1c2d3e4f5g6
Revises: ea1c3a5b9c21
Create Date: 2025-07-11 13:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b1c2d3e4f5g6'
down_revision: Union[str, None] = 'ea1c3a5b9c21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add new columns
    op.add_column('ad_sets', sa.Column('first_seen_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('ad_sets', sa.Column('last_seen_date', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_ad_sets_first_seen_date', 'ad_sets', ['first_seen_date'])
    op.create_index('ix_ad_sets_last_seen_date', 'ad_sets', ['last_seen_date'])

    # 2. Backfill existing rows with min/max date_found from ads table
    backfill_sql = """
    UPDATE ad_sets AS s
    SET first_seen_date = sub.min_date,
        last_seen_date = sub.max_date
    FROM (
        SELECT ad_set_id, MIN(date_found) AS min_date, MAX(date_found) AS max_date
        FROM ads
        WHERE ad_set_id IS NOT NULL
        GROUP BY ad_set_id
    ) AS sub
    WHERE s.id = sub.ad_set_id;
    """
    op.execute(backfill_sql)


def downgrade() -> None:
    op.drop_index('ix_ad_sets_last_seen_date', table_name='ad_sets')
    op.drop_index('ix_ad_sets_first_seen_date', table_name='ad_sets')
    op.drop_column('ad_sets', 'last_seen_date')
    op.drop_column('ad_sets', 'first_seen_date') 