"""Add video_style_templates table

Revision ID: i9j0k1l2m3n4
Revises: 4f1bc26260f3
Create Date: 2025-11-26 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'i9j0k1l2m3n4'
down_revision: Union[str, None] = '4f1bc26260f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create video_style_templates table for storing analyzed video styles
    op.create_table('video_style_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('video_url', sa.String(), nullable=False),
        sa.Column('thumbnail_url', sa.String(), nullable=True),
        sa.Column('style_characteristics', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('analysis_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('gemini_file_uri', sa.String(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_video_style_templates_id'), 'video_style_templates', ['id'], unique=False)
    op.create_index(op.f('ix_video_style_templates_name'), 'video_style_templates', ['name'], unique=False)


def downgrade() -> None:
    # Drop video_style_templates table
    op.drop_index(op.f('ix_video_style_templates_name'), table_name='video_style_templates')
    op.drop_index(op.f('ix_video_style_templates_id'), table_name='video_style_templates')
    op.drop_table('video_style_templates')
