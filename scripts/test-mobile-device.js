#!/usr/bin/env node

const { exec } = require('child_process');
const colors = require('colors');
const fs = require('fs');
const path = require('path');

async function checkMobileSetup() {
  console.log('\n📱 MOBILE DEVICE TESTING SETUP'.bold.cyan);
  console.log('='.repeat(50).gray);

  // Check if we're in mobile-app directory
  const mobileAppPath = path.join(process.cwd(), 'mobile-app');
  
  if (!fs.existsSync(mobileAppPath)) {
    console.log('❌ mobile-app directory not found'.red);
    return false;
  }

  // Check package.json
  const packageJsonPath = path.join(mobileAppPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json not found in mobile-app'.red);
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log(`📦 App: ${packageJson.name || 'EventConnect Mobile'}`.green);
  console.log(`📊 Version: ${packageJson.version || '1.0.0'}`.green);

  return true;
}

function runCommand(command, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 ${description}...`.yellow);
    console.log(`   Command: ${command}`.gray);
    
    const process = exec(command, { cwd: path.join(process.cwd(), 'mobile-app') });
    
    let output = '';
    let errorOutput = '';
    
    process.stdout.on('data', (data) => {
      output += data;
    });
    
    process.stderr.on('data', (data) => {
      errorOutput += data;
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully`.green);
        if (output.trim()) {
          console.log(`   Output: ${output.trim().substring(0, 200)}...`.gray);
        }
        resolve(output);
      } else {
        console.log(`❌ ${description} failed (exit code: ${code})`.red);
        if (errorOutput.trim()) {
          console.log(`   Error: ${errorOutput.trim().substring(0, 200)}...`.red);
        }
        reject(new Error(`Command failed: ${command}`));
      }
    });
  });
}

async function checkPrerequisites() {
  console.log('\n🔍 CHECKING PREREQUISITES'.bold.cyan);
  console.log('='.repeat(50).gray);

  const checks = [
    {
      name: 'Node.js',
      command: 'node --version',
      test: (output) => output.includes('v')
    },
    {
      name: 'npm',
      command: 'npm --version',
      test: (output) => /\d+\.\d+\.\d+/.test(output)
    },
    {
      name: 'Expo CLI',
      command: 'npx expo --version',
      test: (output) => /\d+\.\d+\.\d+/.test(output)
    }
  ];

  for (const check of checks) {
    try {
      const output = await runCommand(check.command, `Checking ${check.name}`);
      if (check.test(output.trim())) {
        console.log(`✅ ${check.name}: ${output.trim()}`.green);
      } else {
        console.log(`❌ ${check.name}: Unexpected output`.red);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: Not found or error`.red);
    }
  }
}

async function runMobileTests() {
  console.log('\n📱 MOBILE APP TESTING GUIDE'.bold.cyan);
  console.log('='.repeat(50).gray);

  console.log('\n1️⃣  DEVELOPMENT TESTING:'.bold.yellow);
  console.log('   Run: cd mobile-app && npm start');
  console.log('   Options:');
  console.log('   📱 Press "i" for iOS Simulator');
  console.log('   🤖 Press "a" for Android Emulator');
  console.log('   📲 Scan QR code with Expo Go app');

  console.log('\n2️⃣  DEVICE TESTING OPTIONS:'.bold.yellow);
  
  console.log('\n📲 Option A: Expo Go App (Easiest)');
  console.log('   1. Install "Expo Go" from App Store/Play Store');
  console.log('   2. Start development server: npm start');
  console.log('   3. Scan QR code with Expo Go app');
  console.log('   ✅ Pros: Quick setup, no build required');
  console.log('   ⚠️  Cons: Limited to Expo SDK features');

  console.log('\n🏗️  Option B: Development Build');
  console.log('   1. Install EAS CLI: npm install -g @expo/eas-cli');
  console.log('   2. Configure: npx eas build:configure');
  console.log('   3. Build: npx eas build --platform android --profile development');
  console.log('   4. Install .apk/.ipa on device');
  console.log('   ✅ Pros: Full native features, custom native code');
  console.log('   ⚠️  Cons: Requires EAS account, longer setup');

  console.log('\n📦 Option C: Local Build (Advanced)');
  console.log('   1. Install: npx expo install expo-dev-client');
  console.log('   2. Configure native directories: npx expo prebuild');
  console.log('   3. Run: npx expo run:android or npx expo run:ios');
  console.log('   ✅ Pros: Full control, local builds');
  console.log('   ⚠️  Cons: Requires Android Studio/Xcode setup');

  console.log('\n3️⃣  TESTING CHECKLIST:'.bold.yellow);
  
  const testItems = [
    '📱 App launches and loads',
    '🔐 Authentication (login/register)',
    '🏠 Home screen data loading',
    '📅 Events list and details',
    '🗺️  Map view with event markers',
    '👥 Tribes functionality',
    '👤 Profile and settings',
    '🔔 Push notifications (if enabled)',
    '📡 Backend connectivity',
    '🎮 Gamification features',
    '🤖 AI recommendations',
    '📱 Navigation between screens',
    '🔄 Pull-to-refresh functionality',
    '⚡ Performance and responsiveness'
  ];

  testItems.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item}`);
  });

  console.log('\n4️⃣  DEBUGGING TOOLS:'.bold.yellow);
  console.log('   📊 React Native Debugger');
  console.log('   🔍 Expo DevTools');
  console.log('   📱 Device console logs');
  console.log('   🌐 Network tab for API calls');
  console.log('   🎯 Expo Go app shake gesture for menu');

  console.log('\n5️⃣  COMMON ISSUES & SOLUTIONS:'.bold.yellow);
  
  const issues = [
    {
      issue: 'Metro bundler port conflict',
      solution: 'npx expo start --clear or change port'
    },
    {
      issue: 'Network timeout on device',
      solution: 'Check firewall, use --tunnel flag'
    },
    {
      issue: 'Maps not loading',
      solution: 'Verify GOOGLE_MAPS_API_KEY in app.config.js'
    },
    {
      issue: 'API calls failing',
      solution: 'Check backend URL in mobile-app/src/services/api.js'
    },
    {
      issue: 'Push notifications not working',
      solution: 'Test on physical device, check permissions'
    }
  ];

  issues.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.issue}:`);
    console.log(`      💡 ${item.solution}`);
  });

  console.log('\n🚀 QUICK START COMMANDS:'.bold.green);
  console.log('='.repeat(50).gray);
  console.log('cd mobile-app');
  console.log('npm install          # Install dependencies');
  console.log('npm start           # Start development server');
  console.log('npx expo doctor     # Check setup');
  console.log('npx expo install    # Fix dependency issues');
}

async function main() {
  try {
    // Check setup
    const setupOk = await checkMobileSetup();
    if (!setupOk) {
      process.exit(1);
    }

    // Check prerequisites
    await checkPrerequisites();

    // Show testing guide
    await runMobileTests();

    console.log('\n🎉 Mobile testing setup complete!'.bold.green);
    console.log('📱 Ready to test on devices and simulators'.green);

  } catch (error) {
    console.log(`❌ Setup failed: ${error.message}`.red);
    process.exit(1);
  }
}

// Run main function
main().catch(console.error);
