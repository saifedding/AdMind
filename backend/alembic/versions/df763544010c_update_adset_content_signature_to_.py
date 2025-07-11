"""update_adset_content_signature_to_visual_hash

Revision ID: df763544010c
Revises: e9be095c41d0
Create Date: 2025-07-11 07:33:54.874053

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df763544010c'
down_revision: Union[str, None] = 'e9be095c41d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
