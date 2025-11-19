"""change_merged_videos_ad_id_to_bigint

Revision ID: b56251654b09
Revises: d2c88cf57fa7
Create Date: 2025-11-16 23:06:56.821297

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b56251654b09'
down_revision: Union[str, None] = 'd2c88cf57fa7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change ad_id column from INTEGER to BIGINT
    op.execute('ALTER TABLE merged_videos ALTER COLUMN ad_id TYPE BIGINT')


def downgrade() -> None:
    # Revert ad_id column from BIGINT to INTEGER
    op.execute('ALTER TABLE merged_videos ALTER COLUMN ad_id TYPE INTEGER')
