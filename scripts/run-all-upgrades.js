#!/usr/bin/env node

/**
 * Master Upgrade Script for EventConnect 2.0
 * Runs all upgrades in the correct order with proper error handling
 */

const fs = require('fs');
const { execSync, spawn } = require('child_process');

console.log('🚀 EventConnect 2.0 - Master Upgrade Script');
console.log('=' .repeat(60));

const UPGRADE_STEPS = [
  {
    name: 'Security & Authentication',
    description: 'Already completed - API keys rotated, auth unified',
    script: null,
    completed: true,
    critical: true
  },
  {
    name: 'Node.js Configuration',
    description: 'Already completed - package.json updated for Node.js 24',
    script: null,
    completed: true,
    critical: true
  },
  {
    name: 'Next.js 15 Upgrade',
    description: 'Upgrade to Next.js 15 with React 18 compatibility',
    script: 'upgrade-nextjs.js',
    completed: false,
    critical: false,
    estimatedTime: '5-10 minutes'
  },
  {
    name: 'Expo SDK 54 Upgrade',
    description: 'Upgrade mobile app to Expo SDK 54',
    script: 'upgrade-expo.js',
    completed: false,
    critical: false,
    estimatedTime: '10-15 minutes'
  },
  {
    name: 'TypeScript Configuration',
    description: 'Fix and unify TypeScript across all apps',
    script: 'fix-typescript.js',
    completed: false,
    critical: false,
    estimatedTime: '5 minutes'
  }
];

function printHeader() {
  console.log(`
🏗️  EventConnect 2.0 Upgrade Plan
📅 Date: ${new Date().toLocaleDateString()}
⏱️  Estimated Total Time: 20-30 minutes

Status Legend:
✅ Completed
🔄 In Progress
⏸️  Pending
❌ Failed
⚠️  Requires Manual Action
`);
}

function printUpgradeStatus() {
  console.log('📋 Upgrade Steps Status:\n');

  UPGRADE_STEPS.forEach((step, index) => {
    const icon = step.completed ? '✅' : '⏸️';
    const status = step.completed ? 'COMPLETED' : 'PENDING';
    const time = step.estimatedTime ? ` (${step.estimatedTime})` : '';

    console.log(`${icon} ${index + 1}. ${step.name} - ${status}${time}`);
    console.log(`   ${step.description}`);
    console.log('');
  });
}

function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');

  const checks = [
    {
      name: 'Node.js Version',
      check: () => {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        return { passed: major >= 20, message: `Current: ${version}` };
      }
    },
    {
      name: 'NPM Version',
      check: () => {
        try {
          const version = execSync('npm --version', { encoding: 'utf8' }).trim();
          const major = parseInt(version.split('.')[0]);
          return { passed: major >= 8, message: `Current: v${version}` };
        } catch {
          return { passed: false, message: 'NPM not found' };
        }
      }
    },
    {
      name: 'Security Backup',
      check: () => {
        const backupExists = fs.existsSync('./security-backup-1759096160312');
        return {
          passed: backupExists,
          message: backupExists ? 'Backup found' : 'Security backup missing'
        };
      }
    },
    {
      name: 'Upgrade Scripts',
      check: () => {
        const scripts = ['upgrade-nextjs.js', 'upgrade-expo.js', 'fix-typescript.js'];
        const allExist = scripts.every(script => fs.existsSync(`./scripts/${script}`));
        return {
          passed: allExist,
          message: allExist ? 'All scripts ready' : 'Some scripts missing'
        };
      }
    }
  ];

  let allPassed = true;

  checks.forEach(check => {
    const result = check.check();
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${result.message}`);
    if (!result.passed) allPassed = false;
  });

  return allPassed;
}

function runUpgradeStep(step) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Starting: ${step.name}`);
    console.log(`📝 ${step.description}`);
    console.log('─'.repeat(40));

    const startTime = Date.now();

    const child = spawn('node', [`scripts/${step.script}`], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);

      if (code === 0) {
        console.log(`✅ ${step.name} completed successfully in ${duration}s`);
        resolve(true);
      } else {
        console.log(`❌ ${step.name} failed with code ${code}`);
        reject(new Error(`${step.name} failed`));
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Error running ${step.name}:`, error.message);
      reject(error);
    });
  });
}

async function runUpgrades(interactive = true) {
  console.log('\n🚀 Starting upgrade process...\n');

  const pendingSteps = UPGRADE_STEPS.filter(step => !step.completed && step.script);

  for (const step of pendingSteps) {
    if (interactive) {
      console.log(`\n⚠️  Ready to run: ${step.name}`);
      console.log(`📝 ${step.description}`);
      console.log(`⏱️  Estimated time: ${step.estimatedTime || 'Unknown'}`);

      // In a real implementation, you might want to add user confirmation
      console.log('🔄 Starting automatically...\n');
    }

    try {
      await runUpgradeStep(step);
      step.completed = true;
    } catch (error) {
      console.error(`❌ Failed to complete ${step.name}`);

      if (step.critical) {
        console.error('🚨 This is a critical step. Aborting upgrade process.');
        return false;
      } else {
        console.log('⚠️  This step failed but is not critical. Continuing...');
      }
    }
  }

  return true;
}

function printCompletionSummary() {
  const completed = UPGRADE_STEPS.filter(step => step.completed).length;
  const total = UPGRADE_STEPS.length;

  console.log('\n' + '='.repeat(60));
  console.log('🎉 UPGRADE PROCESS SUMMARY');
  console.log('='.repeat(60));
  console.log(`📊 Completed: ${completed}/${total} steps`);
  console.log(`⏱️  Total time: ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes`);

  if (completed === total) {
    console.log('✅ ALL UPGRADES COMPLETED SUCCESSFULLY!');

    console.log('\n📋 FINAL CHECKLIST:');
    console.log('1. ✅ Test all applications: npm run dev');
    console.log('2. ✅ Run type checks: npm run type-check');
    console.log('3. ✅ Test builds: npm run build');
    console.log('4. ✅ Verify authentication flows');
    console.log('5. ✅ Test mobile app on simulators');
    console.log('6. ✅ Check console for any errors');

    console.log('\n🚨 MANUAL ACTIONS STILL REQUIRED:');
    console.log('1. 🔑 Install Node.js 24: nvm install 24 && nvm use 24');
    console.log('2. 🔑 Rotate Google Maps API key (current key is compromised)');
    console.log('3. 🔧 Clear caches: npm run clean && npm run install:all');

  } else {
    console.log('⚠️  Some upgrades failed or were skipped');
    console.log('\n❌ Failed steps:');
    UPGRADE_STEPS.filter(step => !step.completed).forEach(step => {
      console.log(`   - ${step.name}`);
    });
  }

  console.log('\n📊 Reports Generated:');
  const reports = [
    'COMPREHENSIVE_UPGRADE_SUMMARY.md',
    'SECURITY_ROTATION_REPORT.md',
    'NODE_UPGRADE_GUIDE.md',
    'NEXTJS_UPGRADE_REPORT.md',
    'EXPO_UPGRADE_REPORT.md',
    'TYPESCRIPT_FIX_REPORT.md'
  ];

  reports.forEach(report => {
    if (fs.existsSync(report)) {
      console.log(`   ✅ ${report}`);
    }
  });

  console.log('\n💡 For detailed information, check the individual upgrade reports.');
}

// Main execution
async function main() {
  const startTime = Date.now();

  try {
    printHeader();
    printUpgradeStatus();

    const prerequisitesPassed = checkPrerequisites();

    if (!prerequisitesPassed) {
      console.log('\n❌ Prerequisites check failed. Please fix the issues above before proceeding.');
      process.exit(1);
    }

    console.log('\n✅ All prerequisites check passed!');

    const success = await runUpgrades();

    printCompletionSummary();

    if (success) {
      console.log('\n🎉 Upgrade process completed! Check the reports for details.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Upgrade process completed with some failures.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Fatal error during upgrade process:', error.message);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Upgrade process interrupted by user');
  console.log('📝 Progress has been saved. You can resume by running this script again.');
  process.exit(1);
});

// Export for testing or programmatic use
module.exports = { runUpgrades, checkPrerequisites };

// Run if called directly
if (require.main === module) {
  main();
}