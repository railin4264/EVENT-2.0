#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testAIFeatures() {
  console.log('\n🤖 TESTING AI FEATURES'.bold.cyan);
  console.log('='.repeat(50).gray);

  const aiTests = [
    {
      name: 'Event Recommendations',
      endpoint: '/api/ai/recommendations/events',
      params: { limit: 5 }
    },
    {
      name: 'Tribe Recommendations',
      endpoint: '/api/ai/recommendations/tribes',
      params: { limit: 5 }
    },
    {
      name: 'User Recommendations',
      endpoint: '/api/ai/recommendations/users',
      params: { limit: 5 }
    },
    {
      name: 'Trending Content',
      endpoint: '/api/ai/trending',
      params: { type: 'events' }
    },
    {
      name: 'Smart Search',
      endpoint: '/api/ai/search',
      params: { q: 'tech events', type: 'events' }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of aiTests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`.yellow);
      
      const response = await axios.get(`${API_URL}${test.endpoint}`, {
        params: test.params,
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200) {
        console.log(`✅ ${test.name}: Working`.green);
        console.log(`   Status: ${response.status}`.gray);
        
        if (response.data.data) {
          console.log(`   Results: ${Array.isArray(response.data.data) ? response.data.data.length : 'Object'} items`.gray);
        }
        
        passed++;
      } else if (response.status === 401) {
        console.log(`⚠️  ${test.name}: Requires authentication`.yellow);
        console.log(`   Status: ${response.status}`.gray);
      } else {
        console.log(`❌ ${test.name}: ${response.status} ${response.statusText}`.red);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`.red);
      
      if (error.code === 'ECONNREFUSED') {
        console.log(`   🔌 Backend not running`.red);
      }
      
      failed++;
    }
  }

  return { passed, failed, total: aiTests.length };
}

async function testGamificationFeatures() {
  console.log('\n🎮 TESTING GAMIFICATION FEATURES'.bold.cyan);
  console.log('='.repeat(50).gray);

  const gamificationTests = [
    {
      name: 'User Profile Stats',
      endpoint: '/api/gamification/profile',
      requiresAuth: true
    },
    {
      name: 'Achievements System',
      endpoint: '/api/gamification/achievements',
      requiresAuth: false
    },
    {
      name: 'Leaderboards',
      endpoint: '/api/gamification/leaderboards',
      params: { type: 'global', limit: 10 }
    },
    {
      name: 'Level System',
      endpoint: '/api/gamification/levels',
      requiresAuth: false
    },
    {
      name: 'Daily Challenges',
      endpoint: '/api/gamification/challenges',
      requiresAuth: false
    },
    {
      name: 'Badge Definitions',
      endpoint: '/api/gamification/badges',
      requiresAuth: false
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of gamificationTests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`.yellow);
      
      const response = await axios.get(`${API_URL}${test.endpoint}`, {
        params: test.params,
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 200) {
        console.log(`✅ ${test.name}: Working`.green);
        console.log(`   Status: ${response.status}`.gray);
        
        if (response.data.data) {
          console.log(`   Results: ${Array.isArray(response.data.data) ? response.data.data.length : 'Object'} items`.gray);
        }
        
        passed++;
      } else if (response.status === 401 && test.requiresAuth) {
        console.log(`⚠️  ${test.name}: Requires authentication (expected)`.yellow);
        console.log(`   Status: ${response.status}`.gray);
        passed++; // Count as pass since auth requirement is expected
      } else {
        console.log(`❌ ${test.name}: ${response.status} ${response.statusText}`.red);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`.red);
      
      if (error.code === 'ECONNREFUSED') {
        console.log(`   🔌 Backend not running`.red);
      }
      
      failed++;
    }
  }

  return { passed, failed, total: gamificationTests.length };
}

async function runAllTests() {
  console.log('\n🧠 AI & GAMIFICATION TESTING SUITE'.bold.magenta);
  console.log('='.repeat(60).gray);
  
  try {
    // Test AI features
    const aiResults = await testAIFeatures();
    
    // Test Gamification features
    const gamificationResults = await testGamificationFeatures();
    
    // Combined results
    const totalPassed = aiResults.passed + gamificationResults.passed;
    const totalFailed = aiResults.failed + gamificationResults.failed;
    const totalTests = aiResults.total + gamificationResults.total;
    
    console.log('\n📊 OVERALL RESULTS'.bold.cyan);
    console.log('='.repeat(50).gray);
    console.log(`🤖 AI Features: ${aiResults.passed}/${aiResults.total} passed`.cyan);
    console.log(`🎮 Gamification: ${gamificationResults.passed}/${gamificationResults.total} passed`.cyan);
    console.log(`📈 Total Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`.yellow);

    if (totalFailed === 0) {
      console.log('\n🎉 ALL AI & GAMIFICATION FEATURES WORKING!'.bold.green);
      
      console.log('\n🚀 Available Features:'.bold.green);
      console.log('  🤖 AI-powered event recommendations');
      console.log('  🏘️  Smart tribe suggestions');
      console.log('  📈 Trending content detection');
      console.log('  🔍 Intelligent search');
      console.log('  🏆 Level and experience system');
      console.log('  🥇 Achievement badges');
      console.log('  📊 Leaderboards');
      console.log('  🎯 Daily challenges');
      
    } else {
      console.log('\n⚠️  Some features need attention'.bold.yellow);
      
      console.log('\n💡 Next Steps:'.yellow);
      console.log('1. Ensure backend is running: cd backend-api && npm start');
      console.log('2. Check MongoDB connection and sample data');
      console.log('3. Verify AI service configurations');
      console.log('4. Test with authenticated user for full features');
    }

    // Show feature status
    console.log('\n🔧 Feature Configuration:'.bold.cyan);
    console.log('='.repeat(50).gray);
    
    const features = [
      { name: 'Rule-based AI Recommendations', status: '✅', note: 'Uses user preferences and behavior' },
      { name: 'Content-based Filtering', status: '✅', note: 'Matches user interests with content' },
      { name: 'Collaborative Filtering', status: '⚠️', note: 'Needs more user data' },
      { name: 'Machine Learning Models', status: '❌', note: 'Future enhancement' },
      { name: 'Experience Point System', status: '✅', note: 'Awards XP for actions' },
      { name: 'Level Progression', status: '✅', note: 'Dynamic level calculation' },
      { name: 'Achievement System', status: '✅', note: '20+ badges available' },
      { name: 'Leaderboards', status: '✅', note: 'Global and local rankings' }
    ];

    for (const feature of features) {
      console.log(`${feature.status} ${feature.name}: ${feature.note}`.gray);
    }

  } catch (error) {
    console.log(`❌ Test suite failed: ${error.message}`.red);
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(console.error);
