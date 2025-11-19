"""create_download_history_table

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2025-11-17 15:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'h8i9j0k1l2m3'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'download_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ad_id', sa.BigInteger(), nullable=True),
        sa.Column('ad_archive_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('video_hd_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('video_sd_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('image_count', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('video_hd_urls', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('video_sd_urls', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('video_urls', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('image_urls', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('media', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('save_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_download_history_ad_archive_id'), 'download_history', ['ad_archive_id'], unique=False)
    op.create_index(op.f('ix_download_history_ad_id'), 'download_history', ['ad_id'], unique=False)
    op.create_index(op.f('ix_download_history_created_at'), 'download_history', ['created_at'], unique=False)
    op.create_index(op.f('ix_download_history_id'), 'download_history', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_download_history_id'), table_name='download_history')
    op.drop_index(op.f('ix_download_history_created_at'), table_name='download_history')
    op.drop_index(op.f('ix_download_history_ad_id'), table_name='download_history')
    op.drop_index(op.f('ix_download_history_ad_archive_id'), table_name='download_history')
    op.drop_table('download_history')
