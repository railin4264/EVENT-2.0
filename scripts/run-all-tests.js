#!/usr/bin/env node

const { spawn } = require('child_process');
const colors = require('colors');
const path = require('path');

function runScript(scriptName, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${description}`.bold.cyan);
    console.log('='.repeat(60).gray);
    
    const scriptPath = path.join(__dirname, scriptName);
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ ${description} completed successfully`.bold.green);
        resolve();
      } else {
        console.log(`\n❌ ${description} failed (exit code: ${code})`.bold.red);
        resolve(); // Continue with other tests even if one fails
      }
    });

    child.on('error', (error) => {
      console.log(`\n❌ Failed to run ${description}: ${error.message}`.bold.red);
      resolve(); // Continue with other tests
    });
  });
}

async function runAllTests() {
  console.log('\n🧪 EVENTCONNECT V2 - COMPREHENSIVE TESTING SUITE'.bold.magenta);
  console.log('='.repeat(70).gray);
  console.log('🔍 Testing all services, APIs, and integrations'.cyan);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`.gray);

  const testSuite = [
    {
      script: 'test-connectivity.js',
      description: 'Backend API Connectivity'
    },
    {
      script: 'setup-mongodb.js',
      description: 'MongoDB Database Setup'
    },
    {
      script: 'setup-redis.js',
      description: 'Redis Cache Setup'
    },
    {
      script: 'setup-google-maps.js',
      description: 'Google Maps Integration'
    },
    {
      script: 'test-ai-gamification.js',
      description: 'AI & Gamification Features'
    },
    {
      script: 'test-mobile-device.js',
      description: 'Mobile Device Testing Guide'
    }
  ];

  let completed = 0;
  const startTime = Date.now();

  try {
    for (const test of testSuite) {
      await runScript(test.script, test.description);
      completed++;
      
      const progress = ((completed / testSuite.length) * 100).toFixed(1);
      console.log(`\n📊 Progress: ${completed}/${testSuite.length} (${progress}%) completed`.bold.yellow);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log('\n🎉 TESTING SUITE COMPLETED!'.bold.green);
    console.log('='.repeat(70).gray);
    console.log(`⏱️  Total time: ${duration} seconds`.green);
    console.log(`📊 Tests completed: ${completed}/${testSuite.length}`.green);
    console.log(`⏰ Finished at: ${new Date().toLocaleString()}`.gray);

    console.log('\n🚀 NEXT STEPS:'.bold.cyan);
    console.log('='.repeat(50).gray);
    console.log('1. 🖥️  Start backend: cd backend-api && npm start');
    console.log('2. 🌐 Start web: cd web-frontend && npm run dev');
    console.log('3. 📱 Start mobile: cd mobile-app && npm start');
    console.log('4. 🧪 Test everything manually');
    console.log('5. 🐛 Fix any issues found');
    console.log('6. 🚀 Deploy to production');

    console.log('\n📋 TESTING CHECKLIST:'.bold.cyan);
    console.log('='.repeat(50).gray);
    
    const checklist = [
      '☐ Backend API responding',
      '☐ MongoDB connected with sample data',
      '☐ Redis cache working (optional)',
      '☐ Google Maps displaying correctly',
      '☐ AI recommendations working',
      '☐ Gamification features active',
      '☐ Web frontend loads and connects',
      '☐ Mobile app runs on device/simulator',
      '☐ Authentication flow working',
      '☐ Real-time features (if any)',
      '☐ Push notifications (mobile)',
      '☐ Performance acceptable',
      '☐ Cross-platform compatibility',
      '☐ Error handling graceful'
    ];

    checklist.forEach(item => console.log(`   ${item}`));

  } catch (error) {
    console.log(`\n❌ Testing suite encountered an error: ${error.message}`.bold.red);
    process.exit(1);
  }
}

// Show environment info
console.log('\n💻 ENVIRONMENT INFO'.bold.cyan);
console.log('='.repeat(50).gray);
console.log(`📁 Working Directory: ${process.cwd()}`);
console.log(`🔧 Node.js Version: ${process.version}`);
console.log(`🖥️  Platform: ${process.platform}`);
console.log(`📊 Architecture: ${process.arch}`);

// Run the complete test suite
runAllTests().catch(console.error);
