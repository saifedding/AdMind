"""Fast Online Video Comparator
================================

This script compares **two remote videos** (HTTP/S URLs) quickly by:
1. Seeking to *N* evenly-spaced timestamps (default 12) instead of decoding the
   whole stream.
2. Hashing those frames with a lightweight `average_hash` (faster than phash).
3. Running the sampling of both videos in parallel threads to overlap network
   I/O and decoding.

Dependencies (install with pip):
    pip install av pillow imagehash requests

Note: PyAV wheels package FFmpeg so you usually don't need FFmpeg installed
separately.
"""

from __future__ import annotations

import concurrent.futures
import requests
from typing import List, Tuple, Any

import av  # type: ignore
from PIL import Image
import imagehash
import time

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _duration_seconds(stream: av.video.stream.VideoStream, container: av.container.input.InputContainer) -> float | None:  # type: ignore[name-defined]
    """Return duration of the video stream in seconds (best effort)."""
    if stream.duration and stream.time_base:  # Prefer per-stream duration
        return float(stream.duration * stream.time_base)
    if container.duration:
        # container.duration is in micro-seconds
        return float(container.duration / 1_000_000)
    return None


def _sample_hashes(
    url: str,
    samples: int = 12,
    resize: int = 8,
) -> List[imagehash.ImageHash]:
    """Return a list of perceptual hashes sampled from the remote video.

    It seeks to *samples* evenly spaced timestamps to avoid decoding the entire
    video. Falls back to sequential reading if seeking isn't supported.
    """
    container = av.open(url, timeout=15)
    video_stream = next(s for s in container.streams if s.type == "video")
    dur_s = _duration_seconds(video_stream, container)

    hashes: List[imagehash.ImageHash] = []

    def _hash_frame(frame: Any):  # accept any type for typing flexibility
        pil_img: Image.Image = frame.to_image()
        hashes.append(imagehash.average_hash(pil_img, hash_size=resize))

    if dur_s and dur_s > 0:
        # Seek method
        step = dur_s / (samples + 1)
        for i in range(samples):
            ts = (i + 1) * step
            # Convert seconds to stream timestamp units (time_base)
            tb = float(video_stream.time_base) if video_stream.time_base else 1.0
            pts = int(ts / tb)
            try:
                container.seek(pts, any_frame=False, backward=True, stream=video_stream)
                frame = next(container.decode(video_stream))
                _hash_frame(frame)
            except (StopIteration, av.AVError):  # type: ignore[attr-defined]
                # Fallback: cannot seek/decode
                break
    else:
        # Unknown duration – sequentially iterate until we collect enough hashes
        for frame in container.decode(video_stream):  # type: ignore[arg-type]
            _hash_frame(frame)
            if len(hashes) >= samples:
                break

    container.close()
    return hashes


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compare_videos_fast(
    url1: str,
    url2: str,
    samples: int = 6,
    hash_cutoff: int = 6,
    similarity_threshold: float = 0.9,
) -> Tuple[bool, float]:
    """Compare two online videos quickly.

    Args:
        url1, url2: Remote video URLs (HTTP/S).
        samples: Number of frames to compare (higher = more robust, slower).
        hash_cutoff: Maximum Hamming distance for two frame hashes to match.
        similarity_threshold: Fraction of matching samples (0-1) to call videos similar.

    Returns:
        (is_similar, similarity_score) – similarity_score is 0-1.
    """

    # 0. Quick metadata check via parallel HEAD requests.
    def _head(url: str):
        try:
            r = requests.head(url, timeout=5, allow_redirects=True)
            return r.headers.get("ETag"), r.headers.get("Content-Length")
        except requests.RequestException:
            return None, None

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        etag1, length1 = pool.submit(_head, url1).result()
        etag2, length2 = pool.submit(_head, url2).result()

    # If both ETags present and equal, videos are identical.
    if etag1 and etag2 and etag1 == etag2:
        print("[✓] Videos considered identical via ETag match.")
        return True, 1.0

    # If Content-Length identical and >0, assume high likelihood of same.
    if length1 and length2 and length1 == length2:
        print("[i] Content-Length values match – performing quick frame check (2 samples).")
        # Still need small verification; reduce samples to 2 for speed.
        samples = min(samples, 2)

    # 1. Collect hashes in parallel to overlap network I/O.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        fut1 = executor.submit(_sample_hashes, url1, samples)
        fut2 = executor.submit(_sample_hashes, url2, samples)
        hashes1 = fut1.result()
        hashes2 = fut2.result()

    common = min(len(hashes1), len(hashes2))
    if common == 0:
        return False, 0.0

    matches = sum(1 for h1, h2 in zip(hashes1[:common], hashes2[:common]) if (h1 - h2) <= hash_cutoff)
    score = matches / common

    method_msg = f"[i] Compared {common} sampled frames; {matches} matched (hash diff ≤ {hash_cutoff})."
    print(method_msg)

    return score >= similarity_threshold, score


# ---------------------------------------------------------------------------
# Example usage
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    URL_A = (
        "https://video.fdxb2-1.fna.fbcdn.net/v/t42.1790-2/501595635_710078641600098_9001144302157184023_n.?"
        "_nc_cat=111&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=u__D-ijGQ7YQ7kNvwEQaajI&_nc_oc=AdmVb4xUEFDDNRY7whObNWmA6fSP3AHooyy17_sMJCrWYGNWDxTnFwzy4n-5HAr_Z4k"
        "&_nc_zt=28&_nc_ht=video.fdxb2-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfR_r3phsy_uKkFbKyZsF_nPJiuGLC3j1-MwVZWAHfA2ZA&oe=68742594"
    )

    URL_B = (
        "https://video.fdxb5-1.fna.fbcdn.net/v/t42.1790-2/499806541_1037702368427204_3792614188364162071_n.?_nc_cat=103&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=Gi_YamPRjn4Q7kNvwE1WWGm&_nc_oc=Admthu2TR-oU9FwH7SbQJZqyWyXRdhu7z81YlAR_JRiY8xYL0C_0-eHSSG_xEFkylxs&_nc_zt=28&_nc_ht=video.fdxb5-1.fna&_nc_gid=FRdl93qaepNksvDaMMRp7Q&oh=00_AfRlqxwwn0Cz7oiLPVNiB57nAf1Fhc9J81gBdyLtx-I8RQ&oe=6874153D"
    )

    URL_C = (
        "https://video.fdxb5-1.fna.fbcdn.net/v/t42.1790-2/502124283_2150294738726470_8517492775858613391_n.?_nc_cat=100&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=n40RreZnnGEQ7kNvwE-CX5D&_nc_oc=AdmnJGwngXeMqLmPO5ObS6cIPr6irdcz_cAqVkt4PlrjZBeHIluNC6IwOhI2AuFdSxo&_nc_zt=28&_nc_ht=video.fdxb5-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfS8OfikW75sJ1OusLfILoXkeS-TyT-groGp8TZx2jhVzA&oe=68743694" )

    print("— Fast Online Video Comparison —")
    start = time.perf_counter()
    similar, similarity = compare_videos_fast(URL_A, URL_C)
    elapsed = time.perf_counter() - start
    print(f"Similarity score: {similarity:.2%}")
    print("Videos are", "SIMILAR" if similar else "DIFFERENT")
    print(f"Time taken: {elapsed:.2f} seconds") 