const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const projectRoot = __dirname;

const config = {
  resolver: {
    alias: {
      src: path.resolve(projectRoot, 'src'),
      '@components': path.resolve(projectRoot, 'src/components'),
      '@services': path.resolve(projectRoot, 'src/services'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
