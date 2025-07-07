#!/usr/bin/env python3
"""
Debug the reprocessing extraction to see what's actually being returned.
"""
import requests
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def debug_reprocess_extraction():
    """Debug what the reprocessing extraction returns"""
    print("🔍 DEBUGGING REPROCESS EXTRACTION")
    print("=" * 50)
    
    try:
        # Get the ad data first
        response = requests.get('http://localhost:8000/api/v1/ads/1084')
        ad = response.json()
        raw_data = ad.get('raw_data', {})
        
        if not raw_data:
            print("❌ No raw data available")
            return
        
        print(f"📋 Testing reprocess extraction for ad {ad.get('id')}")
        
        # Import the ingestion service
        from backend.app.services.ingestion_service import DataIngestionService
        from backend.app.database import get_db
        
        # Create a mock session
        class MockSession:
            def __init__(self):
                pass
        
        # Create ingestion service
        db = MockSession()
        ingestion_service = DataIngestionService(db)
        
        # Test the reprocess extraction method
        enhanced_data = ingestion_service._extract_enhanced_data_from_raw(raw_data)
        
        print(f"\n📊 REPROCESS EXTRACTION RESULTS:")
        print(f"   main_title: '{enhanced_data.get('main_title', 'N/A')}'")
        print(f"   main_body_text: '{enhanced_data.get('main_body_text', 'N/A')[:50]}...'")
        print(f"   main_caption: '{enhanced_data.get('main_caption', 'N/A')}'")
        print(f"   card_count: {enhanced_data.get('card_count', 'N/A')}")
        print(f"   form_details: {type(enhanced_data.get('form_details', 'N/A'))} with {len(enhanced_data.get('form_details', [])) if enhanced_data.get('form_details') else 0} items")
        print(f"   running_countries: {enhanced_data.get('running_countries', [])}")
        
        # Check form_details specifically
        form_details = enhanced_data.get('form_details')
        print(f"\n🔍 FORM_DETAILS ANALYSIS:")
        print(f"   Type: {type(form_details)}")
        print(f"   Value: {form_details}")
        print(f"   Truthy: {bool(form_details)}")
        print(f"   Length: {len(form_details) if form_details else 'N/A'}")
        
        if form_details:
            print(f"   Sample items:")
            for i, item in enumerate(form_details[:3]):
                print(f"     [{i}]: '{item[:50]}{'...' if len(item) > 50 else ''}'")
        
        # Test the problematic condition
        print(f"\n🧪 CONDITION TEST:")
        print(f"   if enhanced_data.get('form_details'): {bool(enhanced_data.get('form_details'))}")
        print(f"   Would update form_details: {'YES' if enhanced_data.get('form_details') else 'NO'}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_reprocess_extraction() 