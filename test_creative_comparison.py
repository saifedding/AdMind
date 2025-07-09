import json
import logging
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.services.creative_comparison_service import CreativeComparisonService

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_image_comparison():
    """Test image comparison functionality"""
    # Sample image URLs
    image_url1 = "https://scontent.fdxb2-1.fna.fbcdn.net/v/t39.35426-6/497848029_3948913998658947_7351662239018085718_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=nxQnOMee6oIQ7kNvwFAx7sU&_nc_oc=AdlIJKDedVpaNBSDhXS2dVZD94AR25DE8oQjZxis_mkF1P8kNePAGuMBLaCSql3Ipv0&_nc_zt=14&_nc_ht=scontent.fdxb2-1.fna&_nc_gid=A-0ybV9RG211oqoD8LV0Ng&oh=00_AfTlW674YCIy4_4JhXlSp6W6GtOaJmaQkSx73_6rI501Lw&oe=6872E288"
    image_url2 = "https://scontent.fdxb2-1.fna.fbcdn.net/v/t39.35426-6/501270508_1047968767280818_2943739564029986859_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=xCL4PLf_bW4Q7kNvwFC--Bs&_nc_oc=Adkn1EPamPrpTCKoWtm5Uc-uR_kcpeRsSp5CdAtYcgWorMhauURqMGyrACx3hOC3w1A&_nc_zt=14&_nc_ht=scontent.fdxb2-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfTMulWaurNs0WEVyZY-W1Vcc4VxIs1JBAG7p8rNFqDPkA&oe=687439F6"
    
    # Get database session
    db = next(get_db())
    comparison_service = CreativeComparisonService(db)
    
    # Compare images
    logger.info("Testing image comparison...")
    similar, diff = comparison_service.compare_images(image_url1, image_url2)
    
    logger.info(f"Images similar: {similar}")
    logger.info(f"Hash difference: {diff}")
    
    return similar, diff

def test_video_comparison():
    """Test video comparison functionality"""
    # Sample video URLs
    video_url1 = "https://video.fdxb2-1.fna.fbcdn.net/v/t42.1790-2/500776772_1046243970804703_2260296777868258061_n.?_nc_cat=111&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=jAl65SwP4FYQ7kNvwGcj7Xq&_nc_oc=AdmTppZ4pnXD3SdF2gAHCNIAoeCUq9YcYnfeZHpjKppaaRA_mZCx-5aFQBciHhu-NeM&_nc_zt=28&_nc_ht=video.fdxb2-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfSYoH938bmQF49QYjshSO3p3Q7FqG63s2DUsDlxKw8v3w&oe=68741178"
    video_url2 = "https://video.fdxb5-1.fna.fbcdn.net/v/t42.1790-2/500585620_1041942271377990_6731322398365148630_n.mp4?_nc_cat=100&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=sUfEhKHH6_QQ7kNvwGGKjZB&_nc_oc=AdnohsNPxbZfgLPAW-XeZOvzdf-P45TYm_z0XqS_OnGcY7eFl2qiQRt-tNKyH06-6Co&_nc_zt=28&_nc_ht=video.fdxb5-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfQYySYuYTIdMpPDiNCFrJpHyWfmkX9RuSIzqXNJXy7tKQ&oe=68743CB4"
    
    # Get database session
    db = next(get_db())
    comparison_service = CreativeComparisonService(db)
    
    # Compare videos
    logger.info("Testing video comparison...")
    similar, score = comparison_service.compare_videos(video_url1, video_url2)
    
    logger.info(f"Videos similar: {similar}")
    logger.info(f"Similarity score: {score:.2f}")
    
    return similar, score

def test_ad_creative_comparison():
    """Test complete ad creative comparison"""
    # Sample ad creatives with different types of media
    creative1 = {
        "id": "1610955929600115-0",
        "title": None,
        "body": "Check out our amazing offer!",
        "caption": None,
        "link_url": None,
        "link_description": None,
        "media": [
            {
                "url": "https://video.fdxb2-1.fna.fbcdn.net/v/t42.1790-2/500776772_1046243970804703_2260296777868258061_n.?_nc_cat=111&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=jAl65SwP4FYQ7kNvwGcj7Xq&_nc_oc=AdmTppZ4pnXD3SdF2gAHCNIAoeCUq9YcYnfeZHpjKppaaRA_mZCx-5aFQBciHhu-NeM&_nc_zt=28&_nc_ht=video.fdxb2-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfSYoH938bmQF49QYjshSO3p3Q7FqG63s2DUsDlxKw8v3w&oe=68741178",
                "type": "Video"
            }
        ]
    }
    
    creative2 = {
        "id": "1610955929600116-0",
        "title": None,
        "body": "Check out our amazing offer!",
        "caption": None,
        "link_url": None,
        "link_description": None,
        "media": [
            {
                "url": "https://video.fdxb5-1.fna.fbcdn.net/v/t42.1790-2/500585620_1041942271377990_6731322398365148630_n.mp4?_nc_cat=100&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=sUfEhKHH6_QQ7kNvwGGKjZB&_nc_oc=AdnohsNPxbZfgLPAW-XeZOvzdf-P45TYm_z0XqS_OnGcY7eFl2qiQRt-tNKyH06-6Co&_nc_zt=28&_nc_ht=video.fdxb5-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfQYySYuYTIdMpPDiNCFrJpHyWfmkX9RuSIzqXNJXy7tKQ&oe=68743CB4",
                "type": "Video"
            }
        ]
    }
    
    creative3 = {
        "id": "1610955929600117-0",
        "title": None,
        "body": "A completely different ad creative!",
        "caption": None,
        "link_url": None,
        "link_description": None,
        "media": [
            {
                "url": "https://scontent.fdxb2-1.fna.fbcdn.net/v/t39.35426-6/501270508_1047968767280818_2943739564029986859_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=xCL4PLf_bW4Q7kNvwFC--Bs&_nc_oc=Adkn1EPamPrpTCKoWtm5Uc-uR_kcpeRsSp5CdAtYcgWorMhauURqMGyrACx3hOC3w1A&_nc_zt=14&_nc_ht=scontent.fdxb2-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfTMulWaurNs0WEVyZY-W1Vcc4VxIs1JBAG7p8rNFqDPkA&oe=687439F6",
                "type": "Image"
            }
        ]
    }
    
    # Get database session
    db = next(get_db())
    comparison_service = CreativeComparisonService(db)
    
    # Compare creatives
    logger.info("Testing ad creative comparison...")
    
    # Compare similar video creatives
    similar1, score1, type1 = comparison_service.compare_ad_creatives(creative1, creative2)
    logger.info(f"Creatives 1 & 2: similar={similar1}, score={score1:.2f}, type={type1}")
    
    # Compare different creatives (video vs image)
    similar2, score2, type2 = comparison_service.compare_ad_creatives(creative1, creative3)
    logger.info(f"Creatives 1 & 3: similar={similar2}, score={score2:.2f}, type={type2}")
    
    return {
        "similar_creatives": similar1,
        "different_creatives": similar2
    }

def test_complete_ad_grouping():
    """Test complete ad grouping with full ad objects"""
    # Sample ads with creatives 
    ad1 = {
        "ad_archive_id": "1000000000001",
        "meta": {
            "page_id": "123456789",
            "page_name": "Test Page",
            "campaign_id": "campaign1"
        },
        "creatives": [
            {
                "id": "1610955929600115-0",
                "body": "Check out our amazing offer!",
                "media": [
                    {
                        "url": "https://video.fdxb2-1.fna.fbcdn.net/v/t42.1790-2/500776772_1046243970804703_2260296777868258061_n.?_nc_cat=111&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=jAl65SwP4FYQ7kNvwGcj7Xq&_nc_oc=AdmTppZ4pnXD3SdF2gAHCNIAoeCUq9YcYnfeZHpjKppaaRA_mZCx-5aFQBciHhu-NeM&_nc_zt=28&_nc_ht=video.fdxb2-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfSYoH938bmQF49QYjshSO3p3Q7FqG63s2DUsDlxKw8v3w&oe=68741178",
                        "type": "Video"
                    }
                ]
            }
        ]
    }
    
    ad2 = {
        "ad_archive_id": "1000000000002",
        "meta": {
            "page_id": "123456789",
            "page_name": "Test Page",
            "campaign_id": "campaign1"
        },
        "creatives": [
            {
                "id": "1610955929600116-0",
                "body": "Check out our amazing offer!",
                "media": [
                    {
                        "url": "https://video.fdxb5-1.fna.fbcdn.net/v/t42.1790-2/500585620_1041942271377990_6731322398365148630_n.mp4?_nc_cat=100&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=sUfEhKHH6_QQ7kNvwGGKjZB&_nc_oc=AdnohsNPxbZfgLPAW-XeZOvzdf-P45TYm_z0XqS_OnGcY7eFl2qiQRt-tNKyH06-6Co&_nc_zt=28&_nc_ht=video.fdxb5-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfQYySYuYTIdMpPDiNCFrJpHyWfmkX9RuSIzqXNJXy7tKQ&oe=68743CB4",
                        "type": "Video"
                    }
                ]
            }
        ]
    }
    
    ad3 = {
        "ad_archive_id": "1000000000003",
        "meta": {
            "page_id": "123456789",
            "page_name": "Test Page",
            "campaign_id": "campaign1"
        },
        "creatives": [
            {
                "id": "1610955929600117-0",
                "body": "A completely different ad creative!",
                "media": [
                    {
                        "url": "https://scontent.fdxb2-1.fna.fbcdn.net/v/t39.35426-6/501270508_1047968767280818_2943739564029986859_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=c53f8f&_nc_ohc=xCL4PLf_bW4Q7kNvwFC--Bs&_nc_oc=Adkn1EPamPrpTCKoWtm5Uc-uR_kcpeRsSp5CdAtYcgWorMhauURqMGyrACx3hOC3w1A&_nc_zt=14&_nc_ht=scontent.fdxb2-1.fna&_nc_gid=eDNnjQ2zGQ9Ir197_BVt_w&oh=00_AfTMulWaurNs0WEVyZY-W1Vcc4VxIs1JBAG7p8rNFqDPkA&oe=687439F6",
                        "type": "Image"
                    }
                ]
            }
        ]
    }
    
    # Get database session
    db = next(get_db())
    comparison_service = CreativeComparisonService(db)
    
    # Test ad grouping
    logger.info("Testing ad grouping...")
    should_group_1_2 = comparison_service.should_group_ads(ad1, ad2)
    should_group_1_3 = comparison_service.should_group_ads(ad1, ad3)
    
    logger.info(f"Should group ads 1 & 2: {should_group_1_2}")
    logger.info(f"Should group ads 1 & 3: {should_group_1_3}")
    
    return {
        "should_group_similar_ads": should_group_1_2,
        "should_group_different_ads": should_group_1_3
    }

if __name__ == "__main__":
    logger.info("Running creative comparison tests...")
    
    # Run test functions
    image_results = test_image_comparison()
    video_results = test_video_comparison()
    creative_results = test_ad_creative_comparison()
    grouping_results = test_complete_ad_grouping()
    
    # Print summary
    logger.info("\n=== Test Results Summary ===")
    logger.info(f"Image comparison: {image_results}")
    logger.info(f"Video comparison: {video_results}")
    logger.info(f"Creative comparison: {creative_results}")
    logger.info(f"Ad grouping: {grouping_results}") 