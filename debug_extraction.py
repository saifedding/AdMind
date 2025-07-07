#!/usr/bin/env python3
"""
Debug the extraction logic to see why form_details and card_count are None.
"""
import requests
import json

def debug_ad_extraction(ad_id=1084):
    """Debug a specific ad's extraction"""
    print(f"🔍 DEBUGGING AD {ad_id} EXTRACTION")
    print("=" * 50)
    
    try:
        # Get the ad
        response = requests.get(f'http://localhost:8000/api/v1/ads/{ad_id}')
        ad = response.json()
        
        print(f"📋 Ad Archive ID: {ad.get('ad_archive_id')}")
        print(f"📋 Competitor: {ad.get('competitor', {}).get('name')}")
        
        # Check all fields that should be populated
        fields_to_check = [
            'ad_copy', 'main_title', 'main_body_text', 'main_caption',
            'card_count', 'card_titles', 'card_bodies', 'card_cta_texts',
            'form_details', 'extra_texts', 'targeted_countries'
        ]
        
        print(f"\n📊 FIELD VALUES:")
        for field in fields_to_check:
            value = ad.get(field)
            if value is None:
                print(f"   {field}: None ❌")
            elif isinstance(value, list):
                print(f"   {field}: {len(value)} items ✅")
                if value and len(value) <= 3:
                    for i, item in enumerate(value[:3]):
                        item_str = str(item)[:50] + "..." if len(str(item)) > 50 else str(item)
                        print(f"     [{i}]: {item_str}")
            elif isinstance(value, str):
                preview = value[:50] + "..." if len(value) > 50 else value
                print(f"   {field}: '{preview}' ✅")
            else:
                print(f"   {field}: {value} ✅")
        
        # Check raw data structure
        raw_data = ad.get('raw_data', {})
        snapshot = raw_data.get('snapshot', {})
        
        print(f"\n📊 RAW DATA STRUCTURE:")
        print(f"   Has raw_data: {'✅' if raw_data else '❌'}")
        print(f"   Has snapshot: {'✅' if snapshot else '❌'}")
        
        if snapshot:
            print(f"   Raw title: '{snapshot.get('title', 'N/A')}'")
            print(f"   Raw body: '{snapshot.get('body', {}).get('text', 'N/A')[:50]}...'")
            print(f"   Raw cards: {len(snapshot.get('cards', []))} items")
            print(f"   Raw extra_texts: {len(snapshot.get('extra_texts', []))} items")
            
            if snapshot.get('extra_texts'):
                print(f"   Sample extra_texts:")
                for i, text in enumerate(snapshot.get('extra_texts', [])[:3]):
                    text_content = text.get('text', text) if isinstance(text, dict) else text
                    preview = text_content[:50] + "..." if len(text_content) > 50 else text_content
                    print(f"     [{i}]: '{preview}'")
        
        # Test extraction logic manually
        print(f"\n🧪 MANUAL EXTRACTION TEST:")
        if raw_data:
            # Simulate the ingestion service extraction
            enhanced_data = extract_test_data(raw_data)
            
            print(f"   Extracted main_title: '{enhanced_data.get('main_title', 'N/A')}'")
            print(f"   Extracted main_body_text: '{enhanced_data.get('main_body_text', 'N/A')[:50]}...'")
            print(f"   Extracted card_count: {enhanced_data.get('card_count', 0)}")
            print(f"   Extracted form_details: {len(enhanced_data.get('form_details', []))} items")
            
            if enhanced_data.get('form_details'):
                print(f"   Sample extracted form_details:")
                for i, detail in enumerate(enhanced_data.get('form_details', [])[:3]):
                    preview = detail[:50] + "..." if len(detail) > 50 else detail
                    print(f"     [{i}]: '{preview}'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

def extract_test_data(raw_data):
    """Test version of the extraction logic"""
    enhanced = {}
    
    if not raw_data:
        return enhanced
    
    try:
        # Extract data from snapshot if available
        snapshot = raw_data.get('snapshot', {})
        
        # Extract main content fields
        enhanced['main_title'] = snapshot.get('title', '')
        enhanced['main_body_text'] = snapshot.get('body', {}).get('text', '')
        enhanced['main_caption'] = snapshot.get('caption', '')
        
        # Extract form details from extra_texts
        extra_texts = snapshot.get('extra_texts', [])
        form_details = []
        
        for extra in extra_texts:
            if isinstance(extra, dict):
                text = extra.get('text', '')
            elif isinstance(extra, str):
                text = extra
            else:
                continue
                
            if text.strip():  # Only add non-empty texts
                form_details.append(text)
        
        enhanced['form_details'] = form_details
        
        # Extract card data
        cards = snapshot.get('cards', [])
        if cards:
            enhanced['card_count'] = len(cards)
            enhanced['card_bodies'] = [card.get('body', '') for card in cards]
            enhanced['card_titles'] = [card.get('title', '') for card in cards]
            enhanced['card_cta_texts'] = [card.get('cta_text', '') for card in cards]
        else:
            enhanced['card_count'] = 0
            enhanced['card_bodies'] = []
            enhanced['card_titles'] = []
            enhanced['card_cta_texts'] = []
        
    except Exception as e:
        print(f"❌ Error in test extraction: {e}")
    
    return enhanced

def main():
    """Run debugging"""
    debug_ad_extraction(1084)
    
    print(f"\n" + "=" * 80)
    print(f"🎯 SUMMARY:")
    print(f"1. Check if form_details and card_count fields are properly stored")
    print(f"2. Verify the extraction logic is working on raw data")
    print(f"3. Compare stored values vs. expected extracted values")

if __name__ == "__main__":
    main() 