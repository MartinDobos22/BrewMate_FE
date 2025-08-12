module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '^react-native-paper$': '<rootDir>/__mocks__/react-native-paper.tsx',
    '^@react-native-firebase/auth$': '<rootDir>/__mocks__/firebaseAuth.ts',
    '^@react-native-google-signin/google-signin$': '<rootDir>/__mocks__/googleSignin.ts',
  },
};
