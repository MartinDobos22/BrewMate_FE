import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  progress: number; // 0-1
  visible: boolean;
}

/**
 * Indikátor priebehu synchronizácie.
 */
const SyncProgressIndicator: React.FC<Props> = ({ progress, visible }) => {
  if (!visible) return null;
  const percent = Math.round(progress * 100);
  return (
    <View style={styles.container}>
      <ActivityIndicator color="#fff" />
      <Text style={styles.text}>Synchronizácia {percent}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
  },
  text: { color: '#fff', marginLeft: 8 },
});

export default SyncProgressIndicator;
