#!/usr/bin/env python3

from app.database import get_db
from sqlalchemy import text
import sys

def check_indexes():
    try:
        db = next(get_db())
        
        # Check if indexes exist (PostgreSQL)
        result = db.execute(text("""
            SELECT indexname FROM pg_indexes 
            WHERE indexname LIKE 'idx_%'
            ORDER BY indexname
        """))
        
        indexes = [row[0] for row in result.fetchall()]
        print('Existing performance indexes:')
        for idx in indexes:
            print(f'  - {idx}')
        
        if not indexes:
            print('❌ No performance indexes found!')
            return False
        else:
            print(f'✅ Found {len(indexes)} performance indexes')
            return True
            
    except Exception as e:
        print(f'Error checking indexes: {e}')
        return False

if __name__ == "__main__":
    success = check_indexes()
    sys.exit(0 if success else 1)