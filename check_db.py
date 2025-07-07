import os
from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime, func, Boolean, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base
import json

# --- Database Configuration ---
# These values are taken from your docker-compose.yml file.
DB_USER = os.getenv("POSTGRES_USER", "ads_user")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "ads_password")
DB_NAME = os.getenv("POSTGRES_DB", "ads_db")
# This script runs on your machine (the host) and connects to the port mapped from the Docker container.
DB_HOST = "localhost" 
DB_PORT = "5432"

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# --- SQLAlchemy Model Definition ---
# A simplified version of the Ad model for query purposes.
Base = declarative_base()

class Ad(Base):
    __tablename__ = "ads"
    id = Column(Integer, primary_key=True, index=True)
    ad_archive_id = Column(String, unique=True, nullable=False, index=True)
    meta = Column(JSON, nullable=True)

def check_database_content():
    """Connects to the database, fetches ads, and prints their meta field."""
    print(f"Connecting to database at {DB_HOST}:{DB_PORT}...")
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        print("Connection successful.")
    except Exception as e:
        print(f"--- ERROR CONNECTING TO DATABASE ---")
        print(f"DETAILS: {e}")
        print("\nPlease ensure the Docker containers are running (`docker-compose up -d`).")
        return

    try:
        print("\nFetching all ads from the 'ads' table...")
        ads = db.query(Ad).all()
        
        if not ads:
            print("No ads found in the database.")
            return

        print(f"Found {len(ads)} ads. Inspecting 'meta' field for each:")
        print("=" * 60)
        
        for ad in ads:
            print(f"Ad ID: {ad.id} | Ad Archive ID: {ad.ad_archive_id}")
            
            meta_content = ad.meta
            print(f"  Meta Content (raw): {meta_content}")
            
            if isinstance(meta_content, dict):
                is_active = meta_content.get('is_active')
                print(f"  Value of 'is_active' key: {is_active} (Type: {type(is_active)})")
            else:
                print("  'meta' field is not a valid JSON object (dict) or is NULL.")
            
            print("-" * 60)

    except Exception as e:
        print(f"\n--- ERROR QUERYING DATABASE ---")
        print(f"DETAILS: {e}")
        print("This might happen if the 'ads' table does not exist yet. Try running migrations.")
    finally:
        print("Closing database connection.")
        db.close()

if __name__ == "__main__":
    check_database_content() 