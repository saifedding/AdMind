"""add favorite lists

Revision ID: add_favorite_lists
Revises: 
Create Date: 2025-10-06 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_favorite_lists'
down_revision = None  # Update this to your latest migration revision
branch_labels = None
depends_on = None


def upgrade():
    # Create favorite_lists table
    op.create_table(
        'favorite_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('is_default', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_favorite_lists_user_id', 'favorite_lists', ['user_id'])
    
    # Create favorite_items table
    op.create_table(
        'favorite_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('list_id', sa.Integer(), nullable=False),
        sa.Column('ad_id', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['list_id'], ['favorite_lists.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['ad_id'], ['ads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('list_id', 'ad_id', name='uq_list_ad')
    )
    op.create_index('ix_favorite_items_list_id', 'favorite_items', ['list_id'])
    op.create_index('ix_favorite_items_ad_id', 'favorite_items', ['ad_id'])


def downgrade():
    op.drop_index('ix_favorite_items_ad_id', table_name='favorite_items')
    op.drop_index('ix_favorite_items_list_id', table_name='favorite_items')
    op.drop_table('favorite_items')
    op.drop_index('ix_favorite_lists_user_id', table_name='favorite_lists')
    op.drop_table('favorite_lists')
