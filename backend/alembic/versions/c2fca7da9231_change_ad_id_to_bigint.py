"""change_ad_id_to_bigint

Revision ID: c2fca7da9231
Revises: h8i9j0k1l2m3
Create Date: 2025-11-18 12:19:13.658899

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2fca7da9231'
down_revision: Union[str, None] = 'h8i9j0k1l2m3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change ads.id from INTEGER to BIGINT
    op.alter_column('ads', 'id', type_=sa.BigInteger(), existing_type=sa.Integer(), existing_nullable=False)
    
    # Change all foreign key columns that reference ads.id from INTEGER to BIGINT
    op.alter_column('ad_analyses', 'ad_id', type_=sa.BigInteger(), existing_type=sa.Integer(), existing_nullable=False)
    op.alter_column('veo_generations', 'ad_id', type_=sa.BigInteger(), existing_type=sa.Integer(), existing_nullable=True)
    op.alter_column('favorite_items', 'ad_id', type_=sa.BigInteger(), existing_type=sa.Integer(), existing_nullable=False)
    op.alter_column('ad_sets', 'best_ad_id', type_=sa.BigInteger(), existing_type=sa.Integer(), existing_nullable=True)


def downgrade() -> None:
    # Revert back to INTEGER (may lose data if values exceed INTEGER max)
    op.alter_column('ad_sets', 'best_ad_id', type_=sa.Integer(), existing_type=sa.BigInteger(), existing_nullable=True)
    op.alter_column('favorite_items', 'ad_id', type_=sa.Integer(), existing_type=sa.BigInteger(), existing_nullable=False)
    op.alter_column('veo_generations', 'ad_id', type_=sa.Integer(), existing_type=sa.BigInteger(), existing_nullable=True)
    op.alter_column('ad_analyses', 'ad_id', type_=sa.Integer(), existing_type=sa.BigInteger(), existing_nullable=False)
    op.alter_column('ads', 'id', type_=sa.Integer(), existing_type=sa.BigInteger(), existing_nullable=False)
