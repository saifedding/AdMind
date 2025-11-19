"""remove_merged_videos_fk_constraint

Revision ID: c4bfc2dfb446
Revises: b56251654b09
Create Date: 2025-11-16 23:08:31.242624

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4bfc2dfb446'
down_revision: Union[str, None] = 'b56251654b09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the foreign key constraint
    op.drop_constraint('merged_videos_ad_id_fkey', 'merged_videos', type_='foreignkey')


def downgrade() -> None:
    # Re-add the foreign key constraint
    op.create_foreign_key('merged_videos_ad_id_fkey', 'merged_videos', 'ads', ['ad_id'], ['id'])
