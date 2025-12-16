'use client';

import React from 'react';
import { SearchAdCard } from './SearchAdCard';

// Demo component to showcase video controls
export function VideoControlsDemo() {
  const sampleVideoAd = {
    ad_archive_id: "demo_video_123",
    advertiser: "Demo Advertiser",
    media_type: "video",
    is_active: true,
    start_date: "2024-01-15",
    duration_days: 45,
    creatives_count: 1,
    has_targeting: true,
    has_lead_form: false,
    creatives: [
      {
        body: "Experience the future of technology with our innovative solutions. Transform your business today!",
        headline: "Revolutionary Tech Solutions",
        media: [
          {
            type: "Video",
            url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4"
          }
        ],
        cta: {
          text: "Learn More"
        }
      }
    ],
    meta: {
      page_id: "123456789",
      video_urls: ["https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4"],
      primary_media_url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4"
    }
  };

  const sampleImageAd = {
    ad_archive_id: "demo_image_456",
    advertiser: "Image Demo Co",
    media_type: "image",
    is_active: true,
    start_date: "2023-12-01", // Longer running ad
    duration_days: 120,
    creatives_count: 3,
    has_targeting: true,
    has_lead_form: true,
    creatives: [
      {
        body: "Discover amazing products that will change your life. Shop now and save big!",
        headline: "Amazing Products",
        media: [
          {
            type: "Image",
            url: "https://picsum.photos/400/600?random=1"
          }
        ],
        cta: {
          text: "Shop Now"
        }
      },
      {
        body: "Limited time offer - don't miss out on these incredible deals!",
        headline: "Limited Time Offer",
        media: [
          {
            type: "Image",
            url: "https://picsum.photos/400/600?random=2"
          }
        ],
        cta: {
          text: "Get Deal"
        }
      },
      {
        body: "Join thousands of satisfied customers who love our products.",
        headline: "Customer Favorites",
        media: [
          {
            type: "Image",
            url: "https://picsum.photos/400/600?random=3"
          }
        ],
        cta: {
          text: "Join Now"
        }
      }
    ],
    meta: {
      page_id: "987654321",
      image_urls: [
        "https://picsum.photos/400/600?random=1",
        "https://picsum.photos/400/600?random=2", 
        "https://picsum.photos/400/600?random=3"
      ],
      primary_media_url: "https://picsum.photos/400/600?random=1"
    }
  };

  const [selectedAds, setSelectedAds] = React.useState<Set<string>>(new Set());

  const handleAdSelection = (adId: string, selected: boolean) => {
    setSelectedAds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(adId);
      } else {
        newSet.delete(adId);
      }
      return newSet;
    });
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Enhanced Video Controls Demo</h1>
        <p className="text-gray-400 mb-8">
          Demonstrating the new video controls including play/pause, volume, seeking, fullscreen, and carousel navigation.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Video Ad Demo */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Video Ad (45 days)</h2>
            <SearchAdCard
              ad={sampleVideoAd}
              isSelected={selectedAds.has(sampleVideoAd.ad_archive_id)}
              onSelectionChange={handleAdSelection}
            />
          </div>

          {/* Image Carousel Demo */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Long-running Ad (120 days)</h2>
            <SearchAdCard
              ad={sampleImageAd}
              isSelected={selectedAds.has(sampleImageAd.ad_archive_id)}
              onSelectionChange={handleAdSelection}
            />
          </div>

          {/* New Ad Demo */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">New Ad (3 days)</h2>
            <SearchAdCard
              ad={{
                ...sampleVideoAd,
                ad_archive_id: "demo_new_789",
                advertiser: "New Brand",
                start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                duration_days: 3
              }}
              isSelected={selectedAds.has("demo_new_789")}
              onSelectionChange={handleAdSelection}
            />
          </div>

          {/* Very Long Running Ad Demo */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Established Ad (8 months)</h2>
            <SearchAdCard
              ad={{
                ...sampleImageAd,
                ad_archive_id: "demo_old_101",
                advertiser: "Established Brand",
                start_date: "2023-08-01",
                duration_days: 240
              }}
              isSelected={selectedAds.has("demo_old_101")}
              onSelectionChange={handleAdSelection}
            />
          </div>

          {/* Features List */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">New Features</h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Play/Pause controls
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Volume control & mute
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Progress bar with seeking
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Skip forward/backward (10s)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Fullscreen support
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Time display
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Auto-hide controls
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Carousel navigation
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Responsive design
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Days running indicator
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Color-coded duration tags
              </li>
            </ul>
            
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-semibold text-white">Duration Color Coding:</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                  <span className="text-gray-300">New (≤7 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                  <span className="text-gray-300">Recent (≤30 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                  <span className="text-gray-300">Established (≤90 days)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-400 rounded-full"></span>
                  <span className="text-gray-300">Long-running (90+ days)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">Usage Instructions</h3>
          <ul className="text-blue-200 space-y-1 text-sm">
            <li>• Hover over video to show controls</li>
            <li>• Click center play button or use control bar</li>
            <li>• Drag progress bar to seek to specific time</li>
            <li>• Use volume slider or click mute button</li>
            <li>• Click fullscreen button for immersive viewing</li>
            <li>• Use arrow buttons to navigate carousel ads</li>
            <li>• Controls auto-hide after 3 seconds during playback</li>
          </ul>
        </div>
      </div>
    </div>
  );
}