"""add workflow_type to veo sessions

Revision ID: j0k1l2m3n4o5
Revises: 4f0fd34205ba
Create Date: 2025-01-29 16:01:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'j0k1l2m3n4o5'
down_revision = '4f0fd34205ba'
branch_labels = None
depends_on = None


def upgrade():
    # Add workflow_type column to veo_script_sessions table
    op.add_column('veo_script_sessions', sa.Column('workflow_type', sa.String(), nullable=True))
    
    # Set default value for existing records (assume they are text-to-video)
    op.execute("UPDATE veo_script_sessions SET workflow_type = 'text-to-video' WHERE workflow_type IS NULL")


def downgrade():
    # Remove workflow_type column
    op.drop_column('veo_script_sessions', 'workflow_type')
