// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for react-native LoadingView resolution issue
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // Handle the LoadingView import issue by providing a mock module
    if (moduleName === 'react-native/Libraries/Utilities/LoadingView') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'src/utils/LoadingViewMock.js'),
      };
    }
    // Use default resolver for all other modules
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
