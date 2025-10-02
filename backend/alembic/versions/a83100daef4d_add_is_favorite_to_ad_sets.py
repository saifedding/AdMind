"""add_is_favorite_to_ad_sets

Revision ID: a83100daef4d
Revises: fd2d28d3ca45
Create Date: 2025-10-02 11:57:34.206511

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a83100daef4d'
down_revision: Union[str, None] = 'fd2d28d3ca45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_favorite column to ad_sets table
    op.add_column('ad_sets', sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index(op.f('ix_ad_sets_is_favorite'), 'ad_sets', ['is_favorite'], unique=False)


def downgrade() -> None:
    # Remove is_favorite column from ad_sets table
    op.drop_index(op.f('ix_ad_sets_is_favorite'), table_name='ad_sets')
    op.drop_column('ad_sets', 'is_favorite')
