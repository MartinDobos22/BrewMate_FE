module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    './scripts/babel-inline-env',
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          src: './src',
          '@components': './src/components',
          '@services': './src/services',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
