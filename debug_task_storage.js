// Debug script to test task storage
// Run this in browser console after starting a scraping task

console.log('🔍 Debugging Task Storage');

// Check if tasks are stored in localStorage
const storedTasks = localStorage.getItem('scrapingTasks');
console.log('📦 Raw localStorage data:', storedTasks);

if (storedTasks) {
  try {
    const tasks = JSON.parse(storedTasks);
    console.log('✅ Parsed tasks:', tasks);
    console.log('📊 Number of tasks:', tasks.length);
    
    if (tasks.length > 0) {
      console.log('🎯 Latest task:', tasks[0]);
      console.log('📋 Task structure check:');
      console.log('  - ID:', tasks[0].id);
      console.log('  - Competitor Name:', tasks[0].competitor_name);
      console.log('  - Page ID:', tasks[0].competitor_page_id);
      console.log('  - Status:', tasks[0].status);
      console.log('  - Created At:', tasks[0].created_at);
      console.log('  - Config:', tasks[0].config);
    }
  } catch (error) {
    console.error('❌ Error parsing tasks:', error);
  }
} else {
  console.log('⚠️ No tasks found in localStorage');
  console.log('💡 This could mean:');
  console.log('  1. No scraping tasks have been started yet');
  console.log('  2. Tasks are being stored with a different key');
  console.log('  3. There\'s an error in the task storage logic');
}

// Check all localStorage keys
console.log('🗂️ All localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
}

// Test manual task creation
console.log('🧪 Testing manual task creation...');
const testTask = {
  id: 'test-task-' + Date.now(),
  competitor_name: 'Test Competitor',
  competitor_page_id: '123456789',
  status: {
    task_id: 'test-task-' + Date.now(),
    state: 'PENDING',
    status: 'Test task created manually'
  },
  created_at: new Date().toISOString(),
  config: {
    countries: ['AE'],
    max_pages: 10,
    delay_between_requests: 2,
    active_status: 'all'
  }
};

try {
  const existingTasks = JSON.parse(localStorage.getItem('scrapingTasks') || '[]');
  const updatedTasks = [testTask, ...existingTasks];
  localStorage.setItem('scrapingTasks', JSON.stringify(updatedTasks));
  console.log('✅ Test task created successfully');
  console.log('🔄 Refresh the tasks page to see if it appears');
} catch (error) {
  console.error('❌ Error creating test task:', error);
}