#!/usr/bin/env node

// Simple script to test API connection
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

console.log('🔍 Testing API Connection...');
console.log('API URL:', API_BASE_URL + API_PREFIX);

async function testConnection() {
  try {
    // Use built-in fetch (Node 18+) or fallback
    const fetchFn = globalThis.fetch || (await import('node-fetch')).default;
    const response = await fetchFn(`${API_BASE_URL}${API_PREFIX}/ads?page=1&page_size=1`);
    
    if (response.ok) {
      console.log('✅ API Connection successful!');
      console.log('Status:', response.status);
      const data = await response.json();
      console.log('Response preview:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
    } else {
      console.log('❌ API Connection failed');
      console.log('Status:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check if backend is running: docker ps');
    console.log('2. Check port mapping: docker-compose ps');
    console.log('3. Test manually: curl http://localhost:8000/api/v1/ads');
  }
}

testConnection();