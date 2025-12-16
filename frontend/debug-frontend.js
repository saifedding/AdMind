// Debug script to test frontend API calls
console.log('🔍 Starting frontend debug...');

// Test the API configuration
console.log('API Configuration:', {
  API_BASE_URL: 'http://localhost:8000',
  API_PREFIX: '/api/v1',
  fullURL: 'http://localhost:8000/api/v1'
});

// Test direct fetch to API
async function testDirectAPI() {
  try {
    console.log('📡 Testing direct API call...');
    const response = await fetch('http://localhost:8000/api/v1/ads?page=1&page_size=5');
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response successful');
      console.log('Data structure:', {
        hasData: !!data.data,
        dataLength: data.data?.length,
        hasPagination: !!data.pagination,
        totalItems: data.pagination?.total_items,
        firstAd: data.data?.[0] ? {
          id: data.data[0].id,
          ad_archive_id: data.data[0].ad_archive_id,
          hasAnalysis: !!data.data[0].analysis,
          hasCompetitor: !!data.data[0].competitor
        } : null
      });
      return data;
    } else {
      console.error('❌ API Response failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('❌ API Request failed:', error);
  }
}

// Test the transformer function
function testTransformer(apiData) {
  try {
    console.log('🔄 Testing transformer...');
    
    // Import the transformer (this won't work in browser, but shows the intent)
    // const { transformAdsWithAnalysis } = require('./src/lib/transformers');
    
    // Manual transformation test
    if (apiData?.data?.[0]) {
      const firstAd = apiData.data[0];
      console.log('First ad raw data:', {
        id: firstAd.id,
        ad_archive_id: firstAd.ad_archive_id,
        competitor: firstAd.competitor,
        analysis: firstAd.analysis,
        is_active: firstAd.is_active,
        created_at: firstAd.created_at
      });
      
      // Check if transformation would work
      const hasRequiredFields = !!(firstAd.id && firstAd.ad_archive_id);
      console.log('✅ Has required fields for transformation:', hasRequiredFields);
    }
  } catch (error) {
    console.error('❌ Transformer test failed:', error);
  }
}

// Run tests
testDirectAPI().then(data => {
  if (data) {
    testTransformer(data);
  }
});

console.log('🔍 Debug script loaded. Check console for results.');