"""add_used_video_url_to_ad_analyses

Revision ID: g7h8i9j0k1l2
Revises: c4bfc2dfb446
Create Date: 2025-11-17 11:58:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g7h8i9j0k1l2'
down_revision = 'c4bfc2dfb446'
branch_labels = None
depends_on = None


def upgrade():
    # Add used_video_url column to ad_analyses table
    op.add_column('ad_analyses', sa.Column('used_video_url', sa.String(), nullable=True))


def downgrade():
    # Remove used_video_url column from ad_analyses table
    op.drop_column('ad_analyses', 'used_video_url')
