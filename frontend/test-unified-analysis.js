#!/usr/bin/env node

// Comprehensive test for unified analysis system
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

console.log('🧪 Testing Unified Analysis System...');
console.log('API URL:', API_BASE_URL + API_PREFIX);

async function testEndpoints() {
  const fetchFn = globalThis.fetch || (await import('node-fetch')).default;
  
  const tests = [
    {
      name: 'Get Ads',
      url: `${API_BASE_URL}${API_PREFIX}/ads?page=1&page_size=5`,
      method: 'GET'
    },
    {
      name: 'Analysis Status',
      url: `${API_BASE_URL}${API_PREFIX}/ads/analysis-status?ad_ids=1,2,3`,
      method: 'GET'
    },
    {
      name: 'Task Status',
      url: `${API_BASE_URL}${API_PREFIX}/tasks/test-task/status`,
      method: 'GET'
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🔍 Testing: ${test.name}`);
      const response = await fetchFn(test.url, { method: test.method });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${test.name}: SUCCESS (${response.status})`);
        console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`❌ ${test.name}: FAILED (${response.status})`);
        const error = await response.text();
        console.log(`   Error: ${error.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      console.log(`   ${error.message}`);
    }
  }

  console.log('\n🎉 Unified Analysis System Test Complete!');
  console.log('\n💡 Next Steps:');
  console.log('1. Frontend should now connect successfully');
  console.log('2. Analysis components should work with task polling');
  console.log('3. Try analyzing an ad to test the full workflow');
}

testEndpoints().catch(console.error);