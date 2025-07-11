"""update_adset_content_signature_to_visual_hash

Revision ID: 8965d492a259
Revises: f2b75a2c1596
Create Date: 2025-07-11 08:32:14.694810

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8965d492a259'
down_revision: Union[str, None] = 'f2b75a2c1596'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
