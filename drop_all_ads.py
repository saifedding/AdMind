import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add backend path to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis

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
    Deletes all records from the 'ads' and 'ad_analyses' tables.
    """
    db = SessionLocal()
    try:
        # The relationship is set to cascade delete, so deleting ads will also delete analyses.
        # However, to be explicit and clear, we can delete them separately.
        # Let's rely on the cascade for efficiency.

        num_ads_deleted = db.query(Ad).delete(synchronize_session=False)
        # No need to delete AdAnalysis separately if cascade is working correctly.
        # num_analyses_deleted = db.query(AdAnalysis).delete(synchronize_session=False)
        
        db.commit()

        print(f"Successfully deleted {num_ads_deleted} ad(s).")
        # print(f"Successfully deleted {num_analyses_deleted} ad analysis record(s).")
        
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("This script will delete all ads and their analyses from the database.")
    choice = input("Are you sure you want to continue? (y/n): ")
    if choice.lower() == 'y':
        drop_all_ads()
    else:
        print("Operation cancelled.") 