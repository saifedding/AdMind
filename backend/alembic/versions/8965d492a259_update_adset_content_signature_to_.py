"""update_adset_content_signature_to_visual_hash

Revision ID: 8965d492a259
Revises: f2b75a2c1596
Create Date: 2025-07-11 08:32:14.694810

"""
from typing import Sequence, Union
import logging

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session

# Import necessary models and services for the migration
from app.models import AdSet, Ad
from app.services.enhanced_ad_extraction import EnhancedAdExtractionService

logger = logging.getLogger(__name__)

# revision identifiers, used by Alembic.
revision: str = '8965d492a259'
down_revision: Union[str, None] = 'f2b75a2c1596'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Backfill existing AdSets with perceptual hashes of their best_ad media.
    This migration updates all existing content_signature fields to use 
    visual identifiers instead of content-based hashes.
    """
    print("Starting migration to update AdSet content_signature to visual hash...")
    
    # Get database connection from Alembic
    bind = op.get_bind()
    session = Session(bind=bind)
    
    try:
        # Initialize the service for hash calculations
        extraction_service = EnhancedAdExtractionService(session)
        
        # Get all existing AdSets
        ad_sets = session.query(AdSet).all()
        print(f"Found {len(ad_sets)} AdSets to update")
        
        updated_count = 0
        failed_count = 0
        
        for ad_set in ad_sets:
            try:
                print(f"Processing AdSet {ad_set.id}...")
                
                # Get the best_ad for this AdSet
                if not ad_set.best_ad_id:
                    print(f"AdSet {ad_set.id} has no best_ad_id, skipping...")
                    continue
                
                best_ad = session.query(Ad).filter(Ad.id == ad_set.best_ad_id).first()
                if not best_ad:
                    print(f"AdSet {ad_set.id} has best_ad_id {ad_set.best_ad_id} but ad not found, skipping...")
                    continue
                
                # Convert the best ad to dict format for hash calculation
                try:
                    best_ad_data = best_ad.to_enhanced_format()
                    if not best_ad_data:
                        print(f"Could not convert best ad {best_ad.id} to dict format, skipping AdSet {ad_set.id}")
                        continue
                    
                    # Calculate new perceptual hash
                    new_signature = extraction_service._generate_content_signature(best_ad_data)
                    if new_signature:
                        # Update the content_signature
                        old_signature = ad_set.content_signature
                        ad_set.content_signature = new_signature
                        
                        print(f"Updated AdSet {ad_set.id}: {old_signature[:10]}... -> {new_signature[:10]}...")
                        updated_count += 1
                    else:
                        print(f"Could not generate perceptual hash for AdSet {ad_set.id}")
                        failed_count += 1
                        
                except Exception as e:
                    print(f"Error processing AdSet {ad_set.id}: {e}")
                    failed_count += 1
                    continue
                    
            except Exception as e:
                print(f"Error processing AdSet {ad_set.id}: {e}")
                failed_count += 1
                continue
        
        # Commit all changes
        session.commit()
        print(f"Migration completed: {updated_count} AdSets updated, {failed_count} failed")
        
    except Exception as e:
        print(f"Migration failed with error: {e}")
        session.rollback()
        raise
    finally:
        session.close()


def downgrade() -> None:
    """
    Downgrade is not supported for this migration as it would require 
    storing the original content-based signatures, which are no longer needed.
    """
    print("Downgrade not supported for content_signature migration - original hashes are not preserved")
    pass
