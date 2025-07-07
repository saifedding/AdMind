import json
from datetime import datetime
import os
import glob

def convert_timestamp_to_date(ts):
    """Converts a UNIX timestamp to a 'YYYY-MM-DD' formatted string."""
    if not ts: return None
    try:
        return datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        return None

def parse_dynamic_lead_form(extra_texts):
    """Dynamically parses lead form questions and options."""
    if not extra_texts: return {}
    form_details = {"questions": {}, "standalone_fields": []}
    standalone_field_keywords = {"full name", "email", "phone number", "country"}
    current_question = None
    for item in extra_texts:
        text = item.get("text", "").strip()
        if not text: continue
        text_lower = text.lower()
        if any(keyword in text_lower for keyword in standalone_field_keywords) and len(text.split()) < 4:
            form_details["standalone_fields"].append(text)
            current_question = None
            continue
        if text.endswith(':'):
            current_question = text
            form_details["questions"][current_question] = []
        elif current_question and len(text.split()) < 6 and "\n" not in text:
            form_details["questions"][current_question].append(text)
    form_details["questions"] = {q: opts for q, opts in form_details["questions"].items() if opts}
    form_details["standalone_fields"] = sorted(list(set(form_details["standalone_fields"])))
    return form_details

def build_detailed_creative_object(card_data):
    """Builds a highly detailed object for a single creative (card)."""
    if not isinstance(card_data, dict): return None
    media_type = "Text/Other"
    if card_data.get("video_hd_url") or card_data.get("videos"):
        media_type = "Video"
    elif card_data.get("original_image_url") or card_data.get("resized_image_url"):
        media_type = "Image"
    
    videos = card_data.get("videos", [])
    video_obj = videos[0] if videos else card_data
    
    creative_object = {
        "headline": card_data.get("title", "").strip() or None,
        "body": card_data.get("body", {}).get("text", "").strip() if isinstance(card_data.get("body"), dict) else card_data.get("body", "").strip() or None,
        "cta": {"text": card_data.get("cta_text"), "type": card_data.get("cta_type")},
        "media": {
            "type": media_type,
            "video_sd": video_obj.get("video_sd_url"),
            "video_hd": video_obj.get("video_hd_url"),
            "video_preview": video_obj.get("video_preview_image_url"),
            "image_original": card_data.get("original_image_url"),
            "image_resized": card_data.get("resized_image_url"),
        },
        "link": {"url": card_data.get("link_url"), "caption": card_data.get("caption", "").strip() or None}
    }
    for key in ["cta", "media", "link"]:
        creative_object[key] = {k: v for k, v in creative_object[key].items() if v}
    return creative_object

def extract_targeting_data(ad_data):
    """
    Extracts detailed targeting and reach data, filtering for countries with non-zero reach.
    """
    transparency_data = ad_data.get("enrichment_response", {}).get("data", {}).get("ad_library_main", {}).get("ad_details", {}).get("transparency_by_location", {})
    targeting_info = {"locations": [], "age_range": None, "gender": None, "reach_breakdown": [], "total_reach": None}
    
    for region in ["uk_transparency", "eu_transparency"]:
        if region_data := transparency_data.get(region):
            targeting_info["locations"] = region_data.get("location_audience", [])
            targeting_info["age_range"] = region_data.get("age_audience")
            targeting_info["gender"] = region_data.get("gender_audience")
            targeting_info["total_reach"] = region_data.get("total_reach") or region_data.get("eu_total_reach")
            
            # --- NEW: Smart Filtering Logic ---
            filtered_reach_breakdown = []
            for country_breakdown in region_data.get("age_country_gender_reach_breakdown", []):
                total_country_reach = 0
                for age_gender in country_breakdown.get("age_gender_breakdowns", []):
                    total_country_reach += age_gender.get("male") or 0
                    total_country_reach += age_gender.get("female") or 0
                    total_country_reach += age_gender.get("unknown") or 0
                
                if total_country_reach > 0:
                    filtered_reach_breakdown.append(country_breakdown)
            
            targeting_info["reach_breakdown"] = filtered_reach_breakdown
            # --- END: Smart Filtering Logic ---
            
            break
            
    return {k: v for k, v in targeting_info.items() if v}

def build_clean_ad_object(ad_data):
    """Transforms a single raw ad variation into a clean, structured object."""
    snapshot = ad_data.get("snapshot", {})
    if not snapshot: return None
    ad_object = {
        "ad_archive_id": ad_data.get("ad_archive_id"),
        "meta": {
            "is_active": ad_data.get("is_active", False),
            "cta_type": snapshot.get("cta_type"),
            "display_format": snapshot.get("display_format"),
        },
        "targeting": extract_targeting_data(ad_data),
        "lead_form": parse_dynamic_lead_form(snapshot.get("extra_texts", [])),
        "creatives": []
    }
    cards = snapshot.get("cards", []) or snapshot.get("videos", [])
    if not cards: cards = [snapshot]
    for card in cards:
        detailed_creative = build_detailed_creative_object(card)
        if detailed_creative: ad_object["creatives"].append(detailed_creative)
    return ad_object

def transform_for_frontend(file_paths):
    """
    Main function to process multiple raw JSON files and merge them into a single,
    clean, frontend-ready payload.
    """
    campaigns = {}
    advertiser_info = {}

    for file_path in file_paths:
        if not os.path.exists(file_path):
            print(f"Warning: File not found, skipping: {file_path}")
            continue
        with open(file_path, 'r', encoding='utf-8') as f:
            data_list = json.load(f)

        for data in data_list:
            edges = data.get("data", {}).get("ad_library_main", {}).get("search_results_connection", {}).get("edges", [])
            if not edges: continue

            if not advertiser_info:
                first_ad = edges[0]['node']['collated_results'][0]
                advertiser_info = {
                    "page_id": first_ad.get("page_id"),
                    "page_name": first_ad.get("page_name"),
                    "page_url": first_ad.get("snapshot", {}).get("page_profile_uri"),
                    "page_likes": first_ad.get("snapshot", {}).get("page_like_count"),
                    "page_profile_picture": first_ad.get("snapshot", {}).get("page_profile_picture_url"),
                }

            for edge in edges:
                for ad_variation_data in edge.get("node", {}).get("collated_results", []):
                    campaign_id = ad_variation_data.get("collation_id")
                    if not campaign_id: continue

                    if campaign_id not in campaigns:
                        campaigns[campaign_id] = {
                            "campaign_id": campaign_id,
                            "platforms": set(),
                            "ads": {}
                        }
                    
                    for platform in ad_variation_data.get("publisher_platform", []):
                        campaigns[campaign_id]["platforms"].add(platform)

                    ad_archive_id = ad_variation_data.get("ad_archive_id")
                    if ad_archive_id not in campaigns[campaign_id]["ads"]:
                        clean_ad = build_clean_ad_object(ad_variation_data)
                        if clean_ad:
                            clean_ad["meta"]["start_date"] = convert_timestamp_to_date(ad_variation_data.get("start_date"))
                            clean_ad["meta"]["end_date"] = convert_timestamp_to_date(ad_variation_data.get("end_date"))
                            campaigns[campaign_id]["ads"][ad_archive_id] = clean_ad
    
    final_campaigns = []
    for cid, camp_data in campaigns.items():
        camp_data["platforms"] = sorted(list(camp_data["platforms"]))
        camp_data["ads"] = list(camp_data["ads"].values())
        final_campaigns.append(camp_data)

    return {"advertiser_info": advertiser_info, "campaigns": final_campaigns}

if __name__ == "__main__":
    try:
        input_files = glob.glob("facebook_ads_data_enhanced_raw_responses*.json")
        if not input_files:
            raise FileNotFoundError("No 'facebook_ads_data_enhanced_raw_responses*.json' files found.")
        
        print(f"Processing files: {', '.join(input_files)}")
        
        frontend_data = transform_for_frontend(input_files)
        
        output_filename = 'frontend_payload_final.json'
        with open(output_filename, 'w', encoding='utf-8') as f_out:
            json.dump(frontend_data, f_out, indent=2, ensure_ascii=False)
            
        print(f"\nSuccessfully processed {len(input_files)} file(s).")
        print(f"Clean, unified payload saved to '{output_filename}'")
        
    except Exception as e:
        print(f"An error occurred: {e}")