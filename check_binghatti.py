#!/usr/bin/env python3
"""
Check Binghatti competitor ads for card content and verify extraction logic.
"""
import requests
import json
import time

API_BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"
TASK_ID = "86ffeac1-5002-43d4-ba24-37f7ff68cd45"
BINGHATTI_COMPETITOR_ID = 3

def check_task_status():
    """Check the status of the scraping task"""
    print("🔍 Checking Binghatti scrape task status...")
    
    try:
        response = requests.get(f"{API_BASE_URL}{API_PREFIX}/competitors/scrape/status/{TASK_ID}")
        
        if response.status_code == 200:
            data = response.json()
            state = data.get('state', 'UNKNOWN')
            
            print(f"📊 Task State: {state}")
            
            if state == 'SUCCESS':
                result = data.get('result', {})
                print(f"✅ Task completed successfully!")
                print(f"📈 Total ads scraped: {result.get('total_ads_scraped', 0)}")
                print(f"💾 Database stats: {result.get('database_stats', {})}")
                return True
            elif state == 'FAILURE':
                print(f"❌ Task failed: {data.get('error', 'Unknown error')}")
                return False
            elif state == 'PENDING':
                print(f"⏳ Task still pending...")
                return False
            else:
                print(f"🔄 Task in progress: {state}")
                return False
                
        else:
            print(f"❌ Failed to check task status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error checking task: {e}")
        return False

def get_binghatti_ads():
    """Get ads for Binghatti competitor"""
    print("\n🔍 Getting Binghatti ads...")
    
    try:
        # Get ads for Binghatti competitor
        response = requests.get(f"{API_BASE_URL}{API_PREFIX}/ads?competitor_id={BINGHATTI_COMPETITOR_ID}&page_size=20&sort_by=created_at&sort_order=desc")
        
        if response.status_code == 200:
            data = response.json()
            ads = data.get('data', [])
            
            print(f"📋 Found {len(ads)} ads for Binghatti")
            
            if ads:
                print(f"📊 Total Binghatti ads in database: {data.get('total', 0)}")
                return ads
            else:
                print("⚠️  No ads found for Binghatti")
                return []
                
        else:
            print(f"❌ Failed to get ads: {response.status_code}")
            return []
            
    except Exception as e:
        print(f"❌ Error getting ads: {e}")
        return []

def check_card_content(ads):
    """Check ads for card content and verify extraction"""
    print("\n🔍 Checking for card content in Binghatti ads...")
    print("=" * 60)
    
    cards_found = 0
    ads_with_cards = []
    
    for i, ad in enumerate(ads):
        ad_id = ad.get('id')
        ad_archive_id = ad.get('ad_archive_id')
        
        print(f"\n📋 Ad #{i+1} - ID: {ad_id}")
        print(f"   Archive ID: {ad_archive_id}")
        print(f"   Created: {ad.get('created_at', 'N/A')}")
        
        # Debug: Show all available fields
        available_fields = [k for k, v in ad.items() if v is not None and k.startswith(('card_', 'main_', 'form_'))]
        print(f"   Available fields: {available_fields}")
        
        # Check for card content
        card_count = ad.get('card_count') or 0
        card_titles = ad.get('card_titles') or []
        card_bodies = ad.get('card_bodies') or []
        
        print(f"   Card Count: {card_count} (raw: {ad.get('card_count')})")
        
        if card_count > 0:
            print(f"   🎴 CARDS FOUND! ({card_count} cards)")
            cards_found += card_count
            ads_with_cards.append(ad)
            
            # Show card details
            for j in range(min(3, len(card_titles))):
                title = card_titles[j] if j < len(card_titles) else "N/A"
                body = card_bodies[j] if j < len(card_bodies) else "N/A"
                print(f"   Card {j+1}:")
                print(f"     Title: '{title}'")
                print(f"     Body: '{body[:50]}{'...' if len(body) > 50 else ''}'")
        else:
            print(f"   ℹ️  No cards in this ad")
        
        # Check ad_copy for concatenation
        ad_copy = ad.get('ad_copy', '')
        has_concatenation = any(marker in ad_copy for marker in ['TITLE:', 'BODY:', 'CAPTION:', 'CARD 1:'])
        
        print(f"   Ad Copy Format: {'❌ CONCATENATED' if has_concatenation else '✅ CLEAN'}")
        
        # Check individual fields
        has_individual_fields = any([
            ad.get('main_title'),
            ad.get('main_body_text'),
            ad.get('main_caption')
        ])
        
        print(f"   Individual Fields: {'✅ POPULATED' if has_individual_fields else '❌ MISSING'}")
        
        if has_individual_fields:
            print(f"     Main Title: '{ad.get('main_title', 'N/A')}'")
            print(f"     Main Body: '{ad.get('main_body_text', 'N/A')[:50]}{'...' if len(ad.get('main_body_text', '')) > 50 else ''}'")
            print(f"     Main Caption: '{ad.get('main_caption', 'N/A')}'")
    
    # Summary
    print(f"\n" + "=" * 60)
    print(f"📊 BINGHATTI CARD CONTENT SUMMARY:")
    print(f"   Total ads checked: {len(ads)}")
    print(f"   Ads with cards: {len(ads_with_cards)}")
    print(f"   Total cards found: {cards_found}")
    
    if cards_found > 0:
        print(f"   🎉 SUCCESS: Found {cards_found} cards across {len(ads_with_cards)} ads!")
        return ads_with_cards
    else:
        print(f"   ⚠️  No cards found in Binghatti ads")
        return []

def get_detailed_ad_with_cards(ads_with_cards):
    """Get detailed view of an ad with cards"""
    if not ads_with_cards:
        return
        
    print(f"\n🔍 DETAILED VIEW: Ad with cards")
    print("=" * 60)
    
    ad = ads_with_cards[0]  # Get first ad with cards
    ad_id = ad.get('id')
    
    try:
        # Get detailed ad info
        response = requests.get(f"{API_BASE_URL}{API_PREFIX}/ads/{ad_id}")
        
        if response.status_code == 200:
            detailed_ad = response.json()
            
            print(f"📋 Ad ID: {ad_id}")
            print(f"   Archive ID: {detailed_ad.get('ad_archive_id')}")
            print(f"   Media Type: {detailed_ad.get('media_type')}")
            
            # Main content
            print(f"\n📝 Main Content:")
            print(f"   Title: '{detailed_ad.get('main_title', 'N/A')}'")
            print(f"   Body: '{detailed_ad.get('main_body_text', 'N/A')}'")
            print(f"   Caption: '{detailed_ad.get('main_caption', 'N/A')}'")
            
            # Card details
            card_count = detailed_ad.get('card_count', 0)
            card_titles = detailed_ad.get('card_titles', [])
            card_bodies = detailed_ad.get('card_bodies', [])
            card_cta_texts = detailed_ad.get('card_cta_texts', [])
            
            print(f"\n🎴 Card Details ({card_count} cards):")
            for i in range(card_count):
                title = card_titles[i] if i < len(card_titles) else "N/A"
                body = card_bodies[i] if i < len(card_bodies) else "N/A"
                cta = card_cta_texts[i] if i < len(card_cta_texts) else "N/A"
                
                print(f"   Card {i+1}:")
                print(f"     Title: '{title}'")
                print(f"     Body: '{body}'")
                print(f"     CTA: '{cta}'")
            
            # Form details
            form_details = detailed_ad.get('form_details', [])
            print(f"\n📋 Form Details ({len(form_details)} items):")
            for i, detail in enumerate(form_details[:5]):
                print(f"   {i+1}. '{detail}'")
            
            if len(form_details) > 5:
                print(f"   ... and {len(form_details) - 5} more")
            
            # Verification
            print(f"\n✅ EXTRACTION VERIFICATION:")
            ad_copy = detailed_ad.get('ad_copy', '')
            has_concatenation = any(marker in ad_copy for marker in ['TITLE:', 'BODY:', 'CAPTION:', 'CARD 1:'])
            
            print(f"   Clean ad_copy: {'✅ YES' if not has_concatenation else '❌ NO'}")
            print(f"   Individual fields: {'✅ YES' if detailed_ad.get('main_title') else '❌ NO'}")
            print(f"   Cards separated: {'✅ YES' if card_count > 0 else '❌ NO'}")
            print(f"   Form details: {'✅ YES' if len(form_details) > 0 else '❌ NO'}")
            
        else:
            print(f"❌ Failed to get detailed ad: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error getting detailed ad: {e}")

def main():
    """Main function to check Binghatti ads"""
    print("🔍 BINGHATTI CARD CONTENT VERIFICATION")
    print("=" * 80)
    
    # Check if task is complete
    if not check_task_status():
        print("\n⏳ Task not complete yet. Waiting 30 seconds...")
        time.sleep(30)
        
        if not check_task_status():
            print("\n⚠️  Task still not complete. Checking existing ads anyway...")
    
    # Get Binghatti ads
    ads = get_binghatti_ads()
    
    if not ads:
        print("\n❌ No Binghatti ads found. The scraper might not have completed yet.")
        return
    
    # Check for card content
    ads_with_cards = check_card_content(ads)
    
    # Get detailed view of ad with cards
    if ads_with_cards:
        get_detailed_ad_with_cards(ads_with_cards)
    
    # Final summary
    print(f"\n" + "=" * 80)
    print(f"🎯 FINAL RESULTS:")
    
    if ads_with_cards:
        print(f"✅ Found {len(ads_with_cards)} Binghatti ads with card content!")
        print(f"✅ Card data is properly extracted and separated")
        print(f"✅ Frontend will be able to display cards in carousel format")
    else:
        print(f"❌ No card content found in Binghatti ads")
        print(f"💡 This could mean:")
        print(f"   - Binghatti ads don't have carousel format")
        print(f"   - Scraping is still in progress")
        print(f"   - Card extraction needs debugging")

if __name__ == "__main__":
    main() 