"""
Ad Grouping Orchestrator (High-Performance Version)
===================================================

This script takes a JSON file of ads and groups them into "ad sets" based on
the visual similarity of their media content.

It uses a highly efficient, parallel pre-computation strategy:
1.  Collect all unique media URLs (images and videos) that need to be compared.
2.  Process this entire workload in parallel, using a thread pool to overlap
    all network I/O and hashing operations.
3.  Use the pre-computed cache of hashes to perform the final grouping, which
    becomes computationally trivial.
"""

from __future__ import annotations

import json
import time
from typing import List, Dict, Any, Set, Tuple, Union
import concurrent.futures
from tqdm import tqdm

# --- Import your existing comparison functions ---
try:
    # We need the low-level hashing functions directly
    from image_comparator_streamed import _download_and_hash as get_image_hash
    from video_comparator_fast import _sample_hashes as get_video_hashes
except ImportError as e:
    print(f"Error: Could not import helper functions. Ensure '_download_and_hash' from 'image_comparator_streamed.py' and '_sample_hashes' from 'video_comparator_fast.py' are accessible. Details: {e}")
    exit(1)

# --- Configuration ---
IMAGE_HASH_CUTOFF = 5
VIDEO_SIMILARITY_THRESHOLD = 0.90
VIDEO_SAMPLES = 6
MAX_WORKERS = 16  # Number of parallel downloads. Increase if your connection is fast.


# This cache will be populated by the parallel pre-computation phase.
# It will store URL -> (hash or list of hashes).
MEDIA_HASH_CACHE: Dict[str, Any] = {}

def process_media_item(url: str, media_type: str) -> Tuple[str, Any]:
    """Worker function to process a single URL. Returns the URL and its hash."""
    if media_type == "image":
        try:
            return url, get_image_hash(url)
        except Exception:
            return url, None
    elif media_type == "video":
        try:
            # Note: _sample_hashes returns a list of hashes
            return url, get_video_hashes(url, samples=VIDEO_SAMPLES)
        except Exception:
            return url, None
    return url, None


def are_ads_similar_cached(ad1: Dict[str, Any], ad2: Dict[str, Any]) -> bool:
    """
    Compares two ads using the pre-computed hash cache. This is extremely fast.
    """
    if ad1.get("media_type") != ad2.get("media_type"):
        return False

    media_type = ad1.get("media_type")

    if media_type == "Image":
        url1, url2 = ad1.get("media_url"), ad2.get("media_url")
        if not url1 or not url2: return False
        if url1 == url2: return True

        hash1 = MEDIA_HASH_CACHE.get(url1)
        hash2 = MEDIA_HASH_CACHE.get(url2)
        if hash1 and hash2:
            return (hash1 - hash2) <= IMAGE_HASH_CUTOFF
        return False

    elif media_type == "Video":
        # 1. High-quality video URL match
        if ad1.get("media_url") and ad1.get("media_url") == ad2.get("media_url"):
            return True

        # 2. Thumbnail comparison
        thumb1_urls, thumb2_urls = ad1.get("main_image_urls", []), ad2.get("main_image_urls", [])
        if thumb1_urls and thumb2_urls:
            thumb1, thumb2 = thumb1_urls[0], thumb2_urls[0]
            if thumb1 == thumb2: return True
            
            hash1 = MEDIA_HASH_CACHE.get(thumb1)
            hash2 = MEDIA_HASH_CACHE.get(thumb2)
            if hash1 and hash2 and (hash1 - hash2) <= IMAGE_HASH_CUTOFF:
                return True

        # 3. Low-quality video stream comparison
        vid1_urls, vid2_urls = ad1.get("main_video_urls", []), ad2.get("main_video_urls", [])
        if len(vid1_urls) > 1 and len(vid2_urls) > 1:
            vid1, vid2 = vid1_urls[1], vid2_urls[1]
            if vid1 == vid2: return True

            hashes1 = MEDIA_HASH_CACHE.get(vid1)
            hashes2 = MEDIA_HASH_CACHE.get(vid2)

            if hashes1 and hashes2:
                common = min(len(hashes1), len(hashes2))
                if common == 0: return False
                matches = sum(1 for h1, h2 in zip(hashes1, hashes2) if (h1 - h2) <= IMAGE_HASH_CUTOFF)
                score = matches / common
                return score >= VIDEO_SIMILARITY_THRESHOLD

    return False


def group_ads_fast(ads: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
    """Groups ads using the pre-computed cache."""
    ad_sets: List[List[Dict[str, Any]]] = []
    assigned_ad_ids: Set[int] = set()

    print("\n--- Phase 3: Grouping ads using cached hashes ---")
    for ad1 in tqdm(ads, desc="Grouping Ads"):
        ad1_id = ad1['id']
        if ad1_id in assigned_ad_ids:
            continue
        
        new_set = [ad1]
        assigned_ad_ids.add(ad1_id)

        for ad2 in ads:
            ad2_id = ad2['id']
            if ad2_id in assigned_ad_ids or ad1_id == ad2_id:
                continue

            if are_ads_similar_cached(ad1, ad2):
                new_set.append(ad2)
                assigned_ad_ids.add(ad2_id)
        
        ad_sets.append(new_set)

    return ad_sets


if __name__ == "__main__":
    start_time = time.perf_counter()

    try:
        with open("ads.json", "r", encoding="utf-8") as f:
            all_ads_data = json.load(f)
        ads_list = all_ads_data.get("data", [])
        print(f"Loaded {len(ads_list)} ads from 'ads.json'.")
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error: Could not load or parse 'ads.json'. Please check the file. Details: {e}")
        exit(1)

    if not ads_list:
        print("No ads found in the JSON file.")
        exit(0)

    # --- Phase 1: Collect all unique media URLs to process ---
    print("\n--- Phase 1: Collecting unique media URLs to process ---")
    urls_to_process: Set[Tuple[str, str]] = set()
    for ad in ads_list:
        media_type = ad.get("media_type")
        if media_type == "Image":
            if ad.get("media_url"):
                urls_to_process.add((ad["media_url"], "image"))
        elif media_type == "Video":
            # Add thumbnail URL
            if ad.get("main_image_urls"):
                urls_to_process.add((ad["main_image_urls"][0], "image"))
            # Add low-quality video URL
            if ad.get("main_video_urls") and len(ad["main_video_urls"]) > 1:
                urls_to_process.add((ad["main_video_urls"][1], "video"))
    
    print(f"Found {len(urls_to_process)} unique media items to hash.")

    # --- Phase 2: Process all unique URLs in parallel ---
    print(f"\n--- Phase 2: Hashing all media in parallel (using up to {MAX_WORKERS} workers) ---")
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Use a map to submit all jobs and wrap with tqdm for a progress bar
        future_to_url = {executor.submit(process_media_item, url, m_type): (url, m_type) for url, m_type in urls_to_process}
        
        for future in tqdm(concurrent.futures.as_completed(future_to_url), total=len(urls_to_process), desc="Hashing Media"):
            url, result = future.result()
            if result:
                MEDIA_HASH_CACHE[url] = result
            else:
                original_url, original_type = future_to_url[future]
                print(f"\n[Warning] Failed to process {original_type} URL: {original_url[:80]}...")

    print(f"Successfully hashed {len(MEDIA_HASH_CACHE)} of {len(urls_to_process)} items.")

    # --- Phase 3: Group ads using the now-complete cache ---
    final_ad_sets = group_ads_fast(ads_list)
    
    # --- Print the results ---
    print("\n\n--- Grouping Complete ---")
    print(f"Found {len(final_ad_sets)} unique ad sets.")
    print("-" * 25)

    for i, ad_set in enumerate(final_ad_sets):
        representative_ad = ad_set[0]
        ad_ids_in_set = sorted([ad['id'] for ad in ad_set])
        print(f"Ad Set {i+1} ({len(ad_set)} ads, type: {representative_ad.get('media_type', 'N/A')})")
        print(f"  - Representative Ad ID: {representative_ad['id']}")
        print(f"  - All Ad IDs in this set: {ad_ids_in_set}")
        print(f"  - Media URL: {representative_ad.get('media_url', 'N/A')[:80]}...")
        print("-" * 15)

    end_time = time.perf_counter()
    print(f"\nTotal time taken: {end_time - start_time:.2f} seconds.")