#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

async function setupGoogleMaps() {
  console.log('\n🌍 SETTING UP GOOGLE MAPS INTEGRATION'.bold.cyan);
  console.log('='.repeat(50).gray);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ GOOGLE_MAPS_API_KEY not found in environment variables'.red);
    console.log('\n💡 SETUP INSTRUCTIONS:'.bold.yellow);
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable the following APIs:');
    console.log('   - Maps JavaScript API');
    console.log('   - Places API');
    console.log('   - Geocoding API');
    console.log('   - Directions API (optional)');
    console.log('4. Create credentials (API Key)');
    console.log('5. Add API key to your .env files:');
    console.log('   Backend: GOOGLE_MAPS_API_KEY=your_api_key_here');
    console.log('   Web: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here');
    console.log('   Mobile: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here');
    console.log('\n⚠️  Important: Restrict your API key to specific domains/IPs for security');
    return;
  }

  console.log('🔑 API Key found, testing Google Maps services...'.yellow);

  const tests = [
    {
      name: 'Geocoding API',
      url: `https://maps.googleapis.com/maps/api/geocode/json?address=New+York+City&key=${apiKey}`,
      test: (data) => data.results && data.results.length > 0
    },
    {
      name: 'Places API (Nearby Search)',
      url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=40.7128,-74.0060&radius=1000&type=restaurant&key=${apiKey}`,
      test: (data) => data.results && Array.isArray(data.results)
    },
    {
      name: 'Places API (Text Search)',
      url: `https://maps.googleapis.com/maps/api/place/textsearch/json?query=events+near+New+York&key=${apiKey}`,
      test: (data) => data.results && Array.isArray(data.results)
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`.yellow);
      
      const response = await axios.get(test.url, { timeout: 10000 });
      
      if (response.data.status === 'OK' && test.test(response.data)) {
        console.log(`✅ ${test.name}: Working correctly`.green);
        console.log(`   Status: ${response.data.status}`.gray);
        if (response.data.results) {
          console.log(`   Results: ${response.data.results.length} items`.gray);
        }
        passed++;
      } else {
        console.log(`❌ ${test.name}: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`.red);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`.red);
      
      if (error.response?.data) {
        console.log(`   Error: ${error.response.data.error_message || error.response.data.status}`.red);
      }
      
      failed++;
    }
  }

  console.log('\n📊 GOOGLE MAPS RESULTS'.bold.cyan);
  console.log('='.repeat(50).gray);
  console.log(`✅ Passed: ${passed}`.green);
  console.log(`❌ Failed: ${failed}`.red);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`.yellow);

  if (passed === tests.length) {
    console.log('\n🎉 ALL GOOGLE MAPS TESTS PASSED!'.bold.green);
    
    console.log('\n📍 Features Available:'.bold.cyan);
    console.log('  ✅ Interactive maps (web & mobile)');
    console.log('  ✅ Event location display');
    console.log('  ✅ Address geocoding');
    console.log('  ✅ Nearby places search');
    console.log('  ✅ Location-based recommendations');
    
  } else {
    console.log('\n⚠️  Some Google Maps features may not work properly'.bold.yellow);
    
    if (failed > 0) {
      console.log('\n💡 Common issues:'.yellow);
      console.log('  - API key restrictions (check allowed domains/IPs)');
      console.log('  - APIs not enabled in Google Cloud Console');
      console.log('  - Billing account not set up');
      console.log('  - Rate limits exceeded');
    }
  }

  // Show configuration status
  console.log('\n⚙️  Configuration Status:'.bold.cyan);
  console.log('='.repeat(50).gray);
  
  const configs = [
    {
      file: 'backend-api/.env',
      key: 'GOOGLE_MAPS_API_KEY',
      required: true
    },
    {
      file: 'web-frontend/.env.local',
      key: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
      required: true
    },
    {
      file: 'mobile-app/app.config.js',
      key: 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
      required: true
    }
  ];

  for (const config of configs) {
    const hasKey = process.env[config.key] ? '✅' : '❌';
    console.log(`${hasKey} ${config.file}: ${config.key}`);
  }

  console.log('\n📱 Mobile Setup Additional Steps:'.bold.yellow);
  console.log('1. Add to app.config.js:');
  console.log('   ios: { config: { googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } }');
  console.log('   android: { config: { googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY } } }');
  console.log('2. Install: npx expo install react-native-maps');
  console.log('3. For iOS: Configure Info.plist if needed');
}

// Run setup
setupGoogleMaps().catch(console.error);
