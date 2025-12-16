// Simple test to debug the ads API call
console.log('🔍 Starting simple ads debug...');

// Test the exact API call that the frontend makes
async function testFrontendAPICall() {
  try {
    console.log('📡 Testing frontend API call...');
    
    // This is the exact URL pattern used by the frontend
    const url = 'http://localhost:8000/api/v1/ads?page=1&page_size=24&sort_by=created_at&sort_order=desc';
    console.log('URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API call successful');
      console.log('Response structure:', {
        hasData: !!data.data,
        dataLength: data.data?.length || 0,
        hasPagination: !!data.pagination,
        totalItems: data.pagination?.total_items || 0,
        totalPages: data.pagination?.total_pages || 0
      });
      
      if (data.data && data.data.length > 0) {
        console.log('First ad sample:', {
          id: data.data[0].id,
          ad_archive_id: data.data[0].ad_archive_id,
          competitor: data.data[0].competitor,
          analysis: data.data[0].analysis,
          is_active: data.data[0].is_active,
          created_at: data.data[0].created_at
        });
      }
      
      return data;
    } else {
      console.error('❌ API call failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    return null;
  }
}

// Test the transformer function manually
function testTransformer(apiData) {
  if (!apiData || !apiData.data || apiData.data.length === 0) {
    console.log('❌ No data to transform');
    return [];
  }
  
  console.log('🔄 Testing transformer...');
  
  try {
    const firstAd = apiData.data[0];
    console.log('Raw ad data:', firstAd);
    
    // Manual transformation similar to transformAdWithAnalysis
    const transformedAd = {
      id: firstAd.id,
      ad_archive_id: firstAd.ad_archive_id,
      ad_copy: firstAd.ad_copy,
      media_type: firstAd.media_type,
      media_url: firstAd.media_url,
      date_found: firstAd.date_found,
      page_name: firstAd.page_name,
      publisher_platform: firstAd.publisher_platform,
      impressions_text: firstAd.impressions_text,
      cta_text: firstAd.cta_text,
      page_id: firstAd.page_id,
      is_favorite: firstAd.is_favorite,
      start_date: firstAd.start_date,
      end_date: firstAd.end_date,
      spend: firstAd.spend,
      page_profile_picture_url: firstAd.page_profile_picture_url,
      main_title: firstAd.main_title,
      main_body_text: firstAd.main_body_text,
      main_caption: firstAd.main_caption,
      main_image_urls: firstAd.main_image_urls,
      main_video_urls: firstAd.main_video_urls,
      competitor_id: firstAd.competitor?.id,
      competitor: firstAd.competitor,
      analysis: firstAd.analysis,
      is_analyzed: firstAd.is_analyzed,
      analysis_summary: firstAd.analysis_summary,
      meta: firstAd.meta || { is_active: firstAd.is_active },
      targeting: firstAd.targeting || { 
        locations: [], 
        age_range: { min: 0, max: 0 }
      },
      lead_form: firstAd.lead_form || { questions: {}, standalone_fields: [] },
      creatives: firstAd.creatives || [],
      ad_set_id: firstAd.ad_set_id,
      variant_count: firstAd.variant_count,
      ad_set_created_at: firstAd.ad_set_created_at,
      ad_set_first_seen_date: firstAd.ad_set_first_seen_date,
      ad_set_last_seen_date: firstAd.ad_set_last_seen_date,
      created_at: firstAd.created_at,
      updated_at: firstAd.updated_at
    };
    
    console.log('✅ Transformation successful');
    console.log('Transformed ad:', transformedAd);
    
    return [transformedAd];
  } catch (error) {
    console.error('❌ Transformation failed:', error);
    return [];
  }
}

// Run the test
testFrontendAPICall().then(data => {
  if (data) {
    const transformed = testTransformer(data);
    console.log('Final result:', {
      originalCount: data.data?.length || 0,
      transformedCount: transformed.length,
      success: transformed.length > 0
    });
  }
});

console.log('🔍 Debug script loaded. Check console for results.');