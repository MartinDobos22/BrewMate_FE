import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * Komponent zobrazujúci aktuálny stav pripojenia.
 */
const ConnectionStatusBar: React.FC = () => {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sub = NetInfo.addEventListener(state => {
      setOnline(Boolean(state.isConnected));
    });
    return () => sub();
  }, []);

  if (online) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Ste offline</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'red',
    paddingVertical: 4,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 12,
  },
});

export default ConnectionStatusBar;
