module.exports = ({ config }) => ({
  ...config,
  scheme: config.scheme || 'eventnow',
  android: {
    ...config.android,
    config: {
      ...config.android?.config,
      googleMaps: {
        ...config.android?.config?.googleMaps,
        apiKey: process.env.ANDROID_GOOGLE_MAPS_API_KEY || config.android?.config?.googleMaps?.apiKey,
      },
    },
  },
  extra: {
    ...config.extra,
    eas: { ...config.extra?.eas, projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId },
  },
});
