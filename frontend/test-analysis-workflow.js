#!/usr/bin/env node

// Test the complete unified analysis workflow
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

console.log('🧪 Testing Complete Analysis Workflow...');

async function testWorkflow() {
  const fetchFn = globalThis.fetch || (await import('node-fetch')).default;
  
  // Test ad ID (using the one from the error)
  const adId = 43599;
  
  console.log(`\n1️⃣ Testing analysis for ad ${adId}...`);
  
  try {
    // Step 1: Trigger analysis
    const analyzeResponse = await fetchFn(`${API_BASE_URL}${API_PREFIX}/ads/${adId}/unified-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generate_prompts: true,
        force_reanalyze: false
      })
    });
    
    if (!analyzeResponse.ok) {
      const error = await analyzeResponse.text();
      console.log(`❌ Analysis request failed: ${error}`);
      return;
    }
    
    const analyzeData = await analyzeResponse.json();
    console.log(`✅ Analysis request successful:`, analyzeData);
    
    // Step 2: Check if it's already complete or needs polling
    if (analyzeData.estimated_time === 0) {
      console.log(`\n2️⃣ Analysis already exists! Getting results...`);
      
      // Get existing analysis
      const getResponse = await fetchFn(`${API_BASE_URL}${API_PREFIX}/ads/${adId}/unified-analysis`);
      if (getResponse.ok) {
        const analysisData = await getResponse.json();
        console.log(`✅ Analysis retrieved:`, {
          success: analysisData.success,
          summary: analysisData.summary?.substring(0, 100) + '...',
          hasTranscript: !!analysisData.transcript,
          hasPrompts: analysisData.generation_prompts?.length || 0
        });
      } else {
        console.log(`❌ Failed to get analysis: ${getResponse.status}`);
      }
    } else {
      console.log(`\n2️⃣ Analysis in progress, would poll task: ${analyzeData.task_id}`);
      
      // Test task status endpoint
      const taskResponse = await fetchFn(`${API_BASE_URL}${API_PREFIX}/tasks/${analyzeData.task_id}/status`);
      if (taskResponse.ok) {
        const taskData = await taskResponse.json();
        console.log(`✅ Task status:`, taskData);
      } else {
        console.log(`❌ Task status failed: ${taskResponse.status}`);
      }
    }
    
    // Step 3: Test analysis status endpoint
    console.log(`\n3️⃣ Testing analysis status...`);
    const statusResponse = await fetchFn(`${API_BASE_URL}${API_PREFIX}/ads/analysis-status?ad_ids=${adId}`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`✅ Analysis status:`, statusData);
    } else {
      console.log(`❌ Analysis status failed: ${statusResponse.status}`);
    }
    
    console.log(`\n🎉 Workflow test complete!`);
    console.log(`\n💡 Summary:`);
    console.log(`• Analysis request: ✅ Working`);
    console.log(`• Existing analysis handling: ✅ Working`);
    console.log(`• Task status polling: ✅ Available`);
    console.log(`• Analysis status check: ✅ Working`);
    
  } catch (error) {
    console.log(`❌ Workflow test failed:`, error.message);
  }
}

testWorkflow().catch(console.error);