#!/usr/bin/env python3
"""
Script to apply performance indexes to the database.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the path
backend_path = Path(__file__).parent / "backend"
sys.path.append(str(backend_path))

try:
    from app.database import engine
    from sqlalchemy import text
    
    def apply_indexes():
        """Apply performance indexes to the database."""
        
        print("🔧 Applying Performance Indexes...")
        print("=" * 40)
        
        # Read the SQL file
        sql_file = Path(__file__).parent / "create_performance_indexes.sql"
        
        if not sql_file.exists():
            print("❌ SQL file not found: create_performance_indexes.sql")
            return False
        
        with open(sql_file, 'r') as f:
            sql_content = f.read()
        
        # Split into individual statements
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        
        success_count = 0
        error_count = 0
        
        with engine.connect() as conn:
            for i, statement in enumerate(statements, 1):
                if statement.upper().startswith(('CREATE INDEX', 'ANALYZE')):
                    try:
                        print(f"Executing statement {i}/{len(statements)}...")
                        conn.execute(text(statement))
                        conn.commit()
                        success_count += 1
                        print(f"  ✅ Success")
                    except Exception as e:
                        error_count += 1
                        print(f"  ⚠️  Warning: {str(e)}")
                else:
                    print(f"Skipping comment/empty statement {i}")
        
        print("\n📊 Summary:")
        print(f"  ✅ Successful: {success_count}")
        print(f"  ⚠️  Warnings: {error_count}")
        
        if success_count > 0:
            print("\n🎉 Performance indexes applied successfully!")
            print("Your database queries should now be significantly faster.")
        
        return True
    
    if __name__ == "__main__":
        apply_indexes()
        
except ImportError as e:
    print(f"❌ Error importing database modules: {e}")
    print("Make sure you're running this from the project root directory.")
    print("Also ensure the backend dependencies are installed:")
    print("  cd backend && pip install -r requirements.txt")
except Exception as e:
    print(f"❌ Unexpected error: {e}")