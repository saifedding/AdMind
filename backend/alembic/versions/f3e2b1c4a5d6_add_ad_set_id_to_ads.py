"""add_ad_set_id_to_ads

Revision ID: f3e2b1c4a5d6
Revises: 8965d492a259
Create Date: 2025-07-11 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f3e2b1c4a5d6'
down_revision: Union[str, None] = '8965d492a259'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add ad_set_id column to ads
    op.add_column('ads', sa.Column('ad_set_id', sa.Integer(), nullable=True))
    # Create foreign key constraint
    op.create_foreign_key(
        'ads_ad_set_id_fkey',
        source_table='ads',
        referent_table='ad_sets',
        local_cols=['ad_set_id'],
        remote_cols=['id'],
        ondelete='SET NULL'
    )
    # Create index
    op.create_index('ix_ads_ad_set_id', 'ads', ['ad_set_id'])


def downgrade() -> None:
    op.drop_index('ix_ads_ad_set_id', table_name='ads')
    op.drop_constraint('ads_ad_set_id_fkey', 'ads', type_='foreignkey')
    op.drop_column('ads', 'ad_set_id') 