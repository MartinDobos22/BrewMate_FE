// components/ResponsiveWrapper.tsx
import React, { JSX } from 'react';
import { SafeAreaView, StatusBar, View, Text, StyleSheet, Platform } from 'react-native';
import { getSafeAreaTop, getSafeAreaBottom } from '../utils/safeArea';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
  statusBarStyle?: 'default' | 'light-content' | 'dark-content';
  statusBarBackground?: string;
}

/**
 * Provides consistent safe-area padding and status bar styling for screens across platforms.
 *
 * @param {ResponsiveWrapperProps} props - Wrapper configuration and children content.
 * @param {React.ReactNode} props.children - Screen content to render within the safe area.
 * @param {string} [props.backgroundColor='#FAF7F5'] - Background color applied to the container.
 * @param {'default'|'light-content'|'dark-content'} [props.statusBarStyle='dark-content'] - Status bar content style.
 * @param {string} [props.statusBarBackground='#6B4423'] - Status bar background color on Android.
 * @returns {JSX.Element} Layout wrapper ensuring proper spacing from device notches and bars.
 */
const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  backgroundColor = '#FAF7F5',
  statusBarStyle = 'dark-content',
  statusBarBackground = '#6B4423',
}: ResponsiveWrapperProps): JSX.Element => {
  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={statusBarBackground}
        translucent={false}
      />
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.content}>
          {React.Children.map(children, child =>
            typeof child === 'string' || typeof child === 'number' ? (
              <Text>{child}</Text>
            ) : (
              child
            ),
          )}
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: getSafeAreaTop(),
  },
  content: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? getSafeAreaBottom() : 0,
  },
});

export default ResponsiveWrapper;
