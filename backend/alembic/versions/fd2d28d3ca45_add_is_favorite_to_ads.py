"""add_is_favorite_to_ads

Revision ID: fd2d28d3ca45
Revises: b1c2d3e4f5g6
Create Date: 2025-10-02 11:06:19.749443

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd2d28d3ca45'
down_revision: Union[str, None] = 'b1c2d3e4f5g6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_favorite column to ads table
    op.add_column('ads', sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index(op.f('ix_ads_is_favorite'), 'ads', ['is_favorite'], unique=False)


def downgrade() -> None:
    # Remove is_favorite column from ads table
    op.drop_index(op.f('ix_ads_is_favorite'), table_name='ads')
    op.drop_column('ads', 'is_favorite')
