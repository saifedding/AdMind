"""add_is_active_field_to_adset

Revision ID: f2b75a2c1596
Revises: df763544010c
Create Date: 2025-07-11 08:05:30.722222

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2b75a2c1596'
down_revision: Union[str, None] = 'df763544010c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
