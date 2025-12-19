"""add category support

Revision ID: add_category_support
Revises: 
Create Date: 2024-12-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_category_support'
down_revision = 'j0k1l2m3n4o5'
branch_labels = None
depends_on = None


def upgrade():
    # Create categories table
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_categories_id', 'categories', ['id'])
    op.create_index('ix_categories_name', 'categories', ['name'])
    
    # Add category_id to competitors table
    op.add_column('competitors', sa.Column('category_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_competitors_category',
        'competitors', 'categories',
        ['category_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_competitors_category_id', 'competitors', ['category_id'])


def downgrade():
    # Remove category_id from competitors
    op.drop_index('ix_competitors_category_id', 'competitors')
    op.drop_constraint('fk_competitors_category', 'competitors', type_='foreignkey')
    op.drop_column('competitors', 'category_id')
    
    # Drop categories table
    op.drop_index('ix_categories_name', 'categories')
    op.drop_index('ix_categories_id', 'categories')
    op.drop_table('categories')
