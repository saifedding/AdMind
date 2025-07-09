# To run this script, you may need to install the following libraries:
# pip install requests Pillow imagehash

import requests
from PIL import Image
import imagehash
import concurrent.futures
import time

def _download_and_hash(url: str):
    """Download an image via streaming and return its perceptual hash."""
    try:
        resp = requests.get(url, stream=True, timeout=10)
        resp.raise_for_status()
        # Read raw bytes in chunks then hash (still efficient for one image)
        img = Image.open(resp.raw)  # type: ignore[arg-type]
        return imagehash.average_hash(img)  # average_hash is faster than phash
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Failed to process {url[:60]}… – {exc}") from exc


def are_images_same(image_url1, image_url2, cutoff: int = 5):
    """Return True/False if two remote images are similar, or None on error.

    The two downloads + hash computations run in parallel to minimise wall time.
    Using average_hash (8×8) for speed; tweak hash function or size if needed.
    """

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        fut1 = executor.submit(_download_and_hash, image_url1)
        fut2 = executor.submit(_download_and_hash, image_url2)
        try:
            hash1 = fut1.result()
            hash2 = fut2.result()
        except RuntimeError as err:
            print(err)
            return None

    diff = hash1 - hash2
    print(f"Hash difference between images is: {diff}")
    return diff <= cutoff

if __name__ == "__main__":
    # Using the updated URLs from your last change
    url1 = "https://scontent.fdxb2-1.fna.fbcdn.net/v/t39.35426-6/497848029_3948913998658947_7351662239018085718_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=nxQnOMee6oIQ7kNvwFAx7sU&_nc_oc=AdlIJKDedVpaNBSDhXS2dVZD94AR25DE8oQjZxis_mkF1P8kNePAGuMBLaCSql3Ipv0&_nc_zt=14&_nc_ht=scontent.fdxb2-1.fna&_nc_gid=A-0ybV9RG211oqoD8LV0Ng&oh=00_AfTlW674YCIy4_4JhXlSp6W6GtOaJmaQkSx73_6rI501Lw&oe=6872E288"
    url2 = "https://scontent.fdxb2-1.fna.fbcdn.net/v/t39.35426-6/501270508_1047968767280818_2943739564029986859_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=xCL4PLf_bW4Q7kNvwFC--Bs&_nc_oc=Adkn1EPamPrpTCKoWtm5Uc-uR_kcpeRsSp5CdAtYcgWorMhauURqMGyrACx3hOC3w1A&_nc_zt=14&_nc_ht=scontent.fdxb2-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfTMulWaurNs0WEVyZY-W1Vcc4VxIs1JBAG7p8rNFqDPkA&oe=687439F6"

    print("--- Comparing two specific images using streaming ---")
    start = time.perf_counter()
    result = are_images_same(url1, url2)
    elapsed = time.perf_counter() - start
    if result is True:
        print("\nConclusion: The two images are the SAME.")
    elif result is False:
        print("\nConclusion: The two images are DIFFERENT.")
    else:
        print("\nConclusion: Could not compare images due to an error.")

    print(f"\nTime taken: {elapsed:.2f} seconds") 