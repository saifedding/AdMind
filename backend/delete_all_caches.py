#!/usr/bin/env python3
"""
Emergency script to delete ALL Gemini caches and stop storage billing.
Run this immediately to stop the $1.00/hour charges.

Usage:
    python delete_all_caches.py
"""

import os
import sys
import requests
from pathlib import Path

# Add parent directory to path to import from app
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal
from app.models.app_setting import AppSetting
from app.models.ad_analysis import AdAnalysis

def get_gemini_api_keys():
    """Load Gemini API keys from database or environment."""
    keys = []
    
    # Try database first
    try:
        db = SessionLocal()
        setting = db.query(AppSetting).filter(AppSetting.key == "gemini_api_keys").first()
        if setting and setting.value:
            import json
            data = json.loads(setting.value) if isinstance(setting.value, str) else setting.value
            if isinstance(data, dict):
                keys = data.get("keys", [])
            elif isinstance(data, list):
                keys = data
        db.close()
    except Exception as e:
        print(f"⚠️  Could not load keys from database: {e}")
    
    # Fallback to environment
    if not keys:
        env_keys = os.getenv("GEMINI_API_KEYS", "")
        if env_keys:
            keys = [k.strip() for k in env_keys.split(",") if k.strip()]
    
    return keys

def list_all_caches(api_key):
    """List all caches for a given API key."""
    url = "https://generativelanguage.googleapis.com/v1beta/cachedContents"
    try:
        resp = requests.get(url, params={"key": api_key}, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("cachedContents", [])
        else:
            print(f"⚠️  Failed to list caches: HTTP {resp.status_code}")
            return []
    except Exception as e:
        print(f"❌ Error listing caches: {e}")
        return []

def delete_cache(cache_name, api_key):
    """Delete a single cache."""
    url = f"https://generativelanguage.googleapis.com/v1beta/{cache_name}"
    try:
        resp = requests.delete(url, params={"key": api_key}, timeout=30)
        if resp.status_code in [200, 204]:
            print(f"✅ Deleted: {cache_name}")
            return True
        else:
            print(f"⚠️  Failed to delete {cache_name}: HTTP {resp.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error deleting {cache_name}: {e}")
        return False

def clear_cache_metadata_from_db():
    """Remove cache metadata from all stored analyses to prevent reuse."""
    try:
        db = SessionLocal()
        analyses = db.query(AdAnalysis).all()
        updated_count = 0
        
        for analysis in analyses:
            if analysis.raw_ai_response:
                import json
                try:
                    raw = json.loads(analysis.raw_ai_response) if isinstance(analysis.raw_ai_response, str) else analysis.raw_ai_response
                    if isinstance(raw, dict):
                        changed = False
                        if "gemini_cache_name" in raw:
                            del raw["gemini_cache_name"]
                            changed = True
                        if "gemini_cache_expire_time" in raw:
                            del raw["gemini_cache_expire_time"]
                            changed = True
                        
                        if changed:
                            analysis.raw_ai_response = json.dumps(raw)
                            updated_count += 1
                except Exception:
                    pass
        
        if updated_count > 0:
            db.commit()
            print(f"✅ Cleared cache metadata from {updated_count} analyses in database")
        else:
            print("ℹ️  No cache metadata found in database")
        
        db.close()
    except Exception as e:
        print(f"⚠️  Could not clear database metadata: {e}")

def main():
    print("=" * 60)
    print("🚨 EMERGENCY CACHE DELETION SCRIPT")
    print("=" * 60)
    print("This will DELETE ALL Gemini caches to STOP storage billing.")
    print()
    
    # Get API keys
    api_keys = get_gemini_api_keys()
    if not api_keys:
        print("❌ No Gemini API keys found!")
        print("   Set GEMINI_API_KEYS environment variable or configure in Settings.")
        return
    
    print(f"Found {len(api_keys)} API key(s)")
    print()
    
    # Delete all caches for each key
    total_deleted = 0
    for i, key in enumerate(api_keys, 1):
        print(f"--- API Key #{i} ---")
        caches = list_all_caches(key)
        
        if not caches:
            print("ℹ️  No caches found for this key")
        else:
            print(f"Found {len(caches)} cache(s)")
            for cache in caches:
                cache_name = cache.get("name", "")
                if cache_name:
                    if delete_cache(cache_name, key):
                        total_deleted += 1
        print()
    
    # Clear metadata from database
    print("--- Cleaning Database ---")
    clear_cache_metadata_from_db()
    print()
    
    # Summary
    print("=" * 60)
    print(f"✅ DONE! Deleted {total_deleted} cache(s)")
    print("💰 Storage billing has been STOPPED")
    print("=" * 60)

if __name__ == "__main__":
    main()
