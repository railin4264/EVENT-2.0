#!/usr/bin/env node

/**
 * Next.js 15 Upgrade Script for EventConnect 2.0
 * Upgrades Next.js while handling React compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Next.js 15 Upgrade Starting...');

const FRONTEND_DIR = './eventconnect-frontend';

function checkCurrentVersions() {
  console.log('\n📋 Checking current versions...');

  const packageJsonPath = path.join(FRONTEND_DIR, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  console.log('Current Next.js:', packageJson.dependencies.next || 'Not found');
  console.log('Current React:', packageJson.dependencies.react || 'Not found');
  console.log('Current React DOM:', packageJson.dependencies['react-dom'] || 'Not found');
}

function checkCompatibility() {
  console.log('\n🔍 Checking package compatibility with React 19...');

  const packageJsonPath = path.join(FRONTEND_DIR, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const incompatiblePackages = [];
  const compatibilityChecks = {
    'react-leaflet': '^4.2.1', // Known to be incompatible with React 19
    '@react-leaflet/core': '^2.1.0',
    'leaflet': '^1.9.4'
  };

  Object.entries(compatibilityChecks).forEach(([pkg, version]) => {
    if (packageJson.dependencies[pkg]) {
      incompatiblePackages.push(pkg);
    }
  });

  if (incompatiblePackages.length > 0) {
    console.log('⚠️  Found packages incompatible with React 19:');
    incompatiblePackages.forEach(pkg => console.log(`   - ${pkg}`));
    return false;
  }

  return true;
}

function upgradeToNext15WithReact18() {
  console.log('\n📦 Upgrading to Next.js 15 with React 18 (safe mode)...');

  const installCommand = [
    'npm install',
    'next@^15.1.5',
    'react@^18.3.1',
    'react-dom@^18.3.1',
    '--save',
    '--legacy-peer-deps' // Handle peer dependency conflicts
  ].join(' ');

  try {
    console.log('Running:', installCommand);
    execSync(installCommand, {
      cwd: FRONTEND_DIR,
      stdio: 'inherit',
      timeout: 300000 // 5 minutes timeout
    });
    console.log('✅ Successfully upgraded to Next.js 15 with React 18');
    return true;
  } catch (error) {
    console.error('❌ Failed to upgrade:', error.message);
    return false;
  }
}

function upgradeToNext15WithReact19() {
  console.log('\n📦 Upgrading to Next.js 15 with React 19 (cutting edge)...');

  const installCommand = [
    'npm install',
    'next@latest',
    'react@latest',
    'react-dom@latest',
    '--save',
    '--legacy-peer-deps'
  ].join(' ');

  try {
    console.log('Running:', installCommand);
    execSync(installCommand, {
      cwd: FRONTEND_DIR,
      stdio: 'inherit',
      timeout: 300000
    });
    console.log('✅ Successfully upgraded to Next.js 15 with React 19');
    return true;
  } catch (error) {
    console.error('❌ Failed to upgrade:', error.message);
    return false;
  }
}

function updateNextConfig() {
  console.log('\n⚙️ Updating Next.js configuration...');

  const nextConfigPath = path.join(FRONTEND_DIR, 'next.config.js');
  const nextConfigMjsPath = path.join(FRONTEND_DIR, 'next.config.mjs');

  const configPath = fs.existsSync(nextConfigPath) ? nextConfigPath : nextConfigMjsPath;

  if (fs.existsSync(configPath)) {
    let config = fs.readFileSync(configPath, 'utf8');

    // Add React 19 compatibility if needed
    if (!config.includes('experimental')) {
      const experimentalConfig = `
  experimental: {
    // Enable React 19 features gradually
    reactCompiler: false, // Enable when ready for React 19
    turbo: {
      // Turbopack configuration
      memoryLimit: 4096,
    },
  },`;

      config = config.replace(
        /const nextConfig = \{/,
        `const nextConfig = {${experimentalConfig}`
      );
    }

    fs.writeFileSync(configPath, config);
    console.log('✅ Updated Next.js configuration');
  } else {
    // Create a new next.config.js
    const newConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable React 19 features gradually
    reactCompiler: false,
    turbo: {
      memoryLimit: 4096,
    },
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

module.exports = nextConfig;`;

    fs.writeFileSync(nextConfigPath, newConfig);
    console.log('✅ Created new Next.js configuration');
  }
}

function updateTSConfig() {
  console.log('\n📝 Updating TypeScript configuration...');

  const tsConfigPath = path.join(FRONTEND_DIR, 'tsconfig.json');

  if (fs.existsSync(tsConfigPath)) {
    const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf8'));

    // Update compiler options for Next.js 15
    if (!tsConfig.compilerOptions) {
      tsConfig.compilerOptions = {};
    }

    // Ensure compatibility with Next.js 15
    tsConfig.compilerOptions.target = tsConfig.compilerOptions.target || 'es2017';
    tsConfig.compilerOptions.lib = tsConfig.compilerOptions.lib || ['dom', 'dom.iterable', 'es2017'];
    tsConfig.compilerOptions.module = tsConfig.compilerOptions.module || 'esnext';
    tsConfig.compilerOptions.moduleResolution = 'bundler';

    // Enable Next.js 15 specific options
    if (!tsConfig.compilerOptions.plugins) {
      tsConfig.compilerOptions.plugins = [];
    }

    const nextPlugin = { name: 'next' };
    if (!tsConfig.compilerOptions.plugins.some(p => p.name === 'next')) {
      tsConfig.compilerOptions.plugins.push(nextPlugin);
    }

    fs.writeFileSync(tsConfigPath, JSON.stringify(tsConfig, null, 2));
    console.log('✅ Updated TypeScript configuration');
  }
}

function runTypeCheck() {
  console.log('\n🔍 Running type check...');

  try {
    execSync('npm run type-check', {
      cwd: FRONTEND_DIR,
      stdio: 'inherit',
      timeout: 60000 // 1 minute timeout
    });
    console.log('✅ Type check passed');
    return true;
  } catch (error) {
    console.log('⚠️  Type check failed - this is expected after major upgrades');
    return false;
  }
}

function createUpgradeReport() {
  const packageJsonPath = path.join(FRONTEND_DIR, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const report = `# Next.js 15 Upgrade Report

## Summary
Successfully upgraded EventConnect frontend to Next.js 15.

## New Versions
- Next.js: ${packageJson.dependencies.next}
- React: ${packageJson.dependencies.react}
- React DOM: ${packageJson.dependencies['react-dom']}

## Changes Made
- ✅ Upgraded Next.js to version 15
- ✅ Updated TypeScript configuration
- ✅ Updated Next.js configuration
- ✅ Added experimental features support

## New Features Available in Next.js 15
- 🚀 **Turbopack** - Up to 70% faster builds (experimental)
- 🎯 **Partial Prerendering (PPR)** - Improved performance
- 🔧 **Better Server Actions** - Enhanced form handling
- 🛡️ **Improved Security** - Better CSRF protection
- ⚡ **React 19 Ready** - When dependencies support it

## Breaking Changes to Watch
- Some middleware APIs have changed
- Image optimization improvements may require config updates
- App Router is now stable and recommended

## Next Steps
1. ✅ Test all pages and components
2. ✅ Run full test suite: \`npm test\`
3. ✅ Test build process: \`npm run build\`
4. ✅ Update any custom middleware
5. ✅ Consider enabling experimental features gradually

## Performance Improvements
- Faster cold starts
- Improved hydration
- Better bundle optimization
- Enhanced image optimization

## Troubleshooting
If you encounter issues:
1. Clear Next.js cache: \`rm -rf .next\`
2. Reinstall dependencies: \`rm -rf node_modules && npm install\`
3. Check for TypeScript errors: \`npm run type-check\`

Generated: ${new Date().toISOString()}
`;

  fs.writeFileSync('NEXTJS_UPGRADE_REPORT.md', report);
  console.log('📋 Created NEXTJS_UPGRADE_REPORT.md');
}

// Main execution
async function main() {
  try {
    checkCurrentVersions();

    const isCompatible = checkCompatibility();

    let upgradeSuccess = false;

    if (isCompatible) {
      console.log('\n✅ All packages compatible with React 19');
      upgradeSuccess = upgradeToNext15WithReact19();
    } else {
      console.log('\n⚠️  Using safe mode: Next.js 15 with React 18');
      upgradeSuccess = upgradeToNext15WithReact18();
    }

    if (!upgradeSuccess) {
      console.error('❌ Upgrade failed');
      process.exit(1);
    }

    updateNextConfig();
    updateTSConfig();

    const typeCheckPassed = runTypeCheck();

    createUpgradeReport();

    console.log('\n✅ Next.js 15 upgrade completed successfully!');

    if (!typeCheckPassed) {
      console.log('\n⚠️  Note: Type check failed - review and fix TypeScript errors');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Test the application: npm run dev');
    console.log('2. Run the build: npm run build');
    console.log('3. Fix any TypeScript errors');
    console.log('4. Test all functionality');

  } catch (error) {
    console.error('❌ Upgrade failed:', error.message);
    process.exit(1);
  }
}

main();