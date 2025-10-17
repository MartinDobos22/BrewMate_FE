// components/ResponsiveWrapper.tsx
import React from 'react';
import {
  SafeAreaView,
  StatusBar,
  Platform,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { getSafeAreaTop, getSafeAreaBottom } from '../utils/safeArea';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  backgroundColor?: string;
  statusBarStyle?: 'default' | 'light-content' | 'dark-content';
  statusBarBackground?: string;
}

const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
                                                               children,
                                                               backgroundColor = '#FAF7F5',
                                                               statusBarStyle = 'dark-content',
                                                               statusBarBackground = '#6B4423',
                                                             }) => {
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
            typeof child === 'string' || typeof child === 'number'
              ? <Text>{child}</Text>
              : child
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
    paddingBottom: Platform.select({
      ios: 0,
      android: getSafeAreaBottom(),
    }),
  },
});

export default ResponsiveWrapper;
