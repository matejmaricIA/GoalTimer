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
    plugins: withUniquePlugins([...(config.plugins ?? []), 'expo-dev-client']),
  };
};
