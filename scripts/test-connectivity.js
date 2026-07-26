#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const API_URL = process.env.API_URL || 'http://localhost:5000';

const tests = [
  {
    name: 'Backend Health Check',
    url: `${API_URL}/health`,
    method: 'GET'
  },
  {
    name: 'Events API',
    url: `${API_URL}/api/events`,
    method: 'GET'
  },
  {
    name: 'AI Recommendations',
    url: `${API_URL}/api/ai/recommendations/events`,
    method: 'GET'
  },
  {
    name: 'Tribes API',
    url: `${API_URL}/api/tribes`,
    method: 'GET'
  },
  {
    name: 'Gamification API',
    url: `${API_URL}/api/gamification/profile`,
    method: 'GET'
  }
];

async function runConnectivityTests() {
  console.log('\n🔍 TESTING BACKEND CONNECTIVITY'.bold.cyan);
  console.log('='.repeat(50).gray);
  
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`.yellow);
      
      const response = await axios({
        method: test.method,
        url: test.url,
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 4xx as "connected"
      });

      console.log(`✅ ${test.name}: ${response.status} ${response.statusText}`.green);
      console.log(`   URL: ${test.url}`.gray);
      
      if (response.data) {
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`.gray);
      }
      
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`.red);
      console.log(`   URL: ${test.url}`.gray);
      
      if (error.code === 'ECONNREFUSED') {
        console.log(`   🔌 Backend is not running on ${API_URL}`.red);
      }
      
      failed++;
    }
  }

  console.log('\n📊 CONNECTIVITY RESULTS'.bold.cyan);
  console.log('='.repeat(50).gray);
  console.log(`✅ Passed: ${passed}`.green);
  console.log(`❌ Failed: ${failed}`.red);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`.yellow);

  if (failed === 0) {
    console.log('\n🎉 ALL CONNECTIVITY TESTS PASSED!'.bold.green);
  } else {
    console.log('\n⚠️  Some tests failed. Check backend status.'.bold.yellow);
  }
}

// Run tests
runConnectivityTests().catch(console.error);

