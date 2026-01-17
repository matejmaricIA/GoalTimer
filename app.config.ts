import type { ConfigContext, ExpoConfig } from '@expo/config';

const withUniquePlugins = (plugins: ExpoConfig['plugins'] = []) => {
  const seen = new Set<string>();
  return plugins.filter((plugin) => {
    if (typeof plugin === 'string') {
      if (seen.has(plugin)) {
        return false;
      }
      seen.add(plugin);
      return true;
    }
    if (Array.isArray(plugin) && typeof plugin[0] === 'string') {
      if (seen.has(plugin[0])) {
        return false;
      }
      seen.add(plugin[0]);
      return true;
    }
    return true;
  });
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidIntentFilters = config.android?.intentFilters ?? [];
  const trackingIntentFilter = {
    action: 'VIEW',
    data: [{ scheme: 'goaltimer', host: 'tracking' }],
    category: ['BROWSABLE', 'DEFAULT'],
  };

  const isDevClient =
    process.env.EXPO_DEV_CLIENT === '1' || process.env.EAS_BUILD_PROFILE === 'development';
  const basePlugins = config.plugins ?? [];

  return {
    ...config,
    name: 'GoalTimer',
    slug: 'goaltimer',
    scheme: 'goaltimer',
    android: {
      ...config.android,
      package: 'com.goaltimer',
      intentFilters: [...androidIntentFilters, trackingIntentFilter],
    },
    plugins: withUniquePlugins(isDevClient ? [...basePlugins, 'expo-dev-client'] : basePlugins),
  };
};
