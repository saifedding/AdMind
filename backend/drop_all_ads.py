import os
from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.ad_set import AdSet

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://ads_user:ads_password@localhost:5432/ads_db")

# When running this script from the host machine, the Docker container's hostname 'db'
# is not resolvable. We replace it with 'localhost' to allow direct connection
# to the database, which should be exposed by Docker.
if 'db:5432' in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace('db:5432', 'localhost:5432')
    print("Adjusted DATABASE_URL for host execution.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def drop_all_ads():
    """
    Deletes all records from the 'ads', 'ad_analyses', and 'ad_sets' tables.
    """
    db = SessionLocal()
    try:
        # First, update ad_sets to set best_ad_id to NULL
        db.query(AdSet).update({AdSet.best_ad_id: None}, synchronize_session=False)
        db.flush()
        
        # Second, update ads to set ad_set_id to NULL
        db.query(Ad).update({Ad.ad_set_id: None}, synchronize_session=False)
        db.flush()
        
        # Get count of ads for reporting
        num_ads = db.query(Ad).count()
        
        # Get count of ad sets for reporting
        num_ad_sets = db.query(AdSet).count()
        
        # Now we can delete ad_sets since nothing references them
        db.query(AdSet).delete(synchronize_session=False)
        
        # Then delete all ads (which will cascade delete analyses)
        db.query(Ad).delete(synchronize_session=False)
        
        db.commit()

        print(f"Successfully deleted {num_ads} ad(s) and {num_ad_sets} ad set(s).")
        
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("This script will delete all ads, ad sets, and their analyses from the database.")
    choice = input("Are you sure you want to continue? (y/n): ")
    if choice.lower() == 'y':
        drop_all_ads()
    else:
        print("Operation cancelled.")
