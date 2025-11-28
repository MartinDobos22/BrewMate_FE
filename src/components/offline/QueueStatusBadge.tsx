import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { offlineSync } from '../../offline/OfflineSync';

/**
 * Zobrazuje počet nesynchronizovaných zmien.
 */
const QueueStatusBadge: React.FC = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const listener = (value: number) => setCount(value);
    offlineSync.addListener(listener);
    return () => offlineSync.removeListener(listener);

    const unsubscribe = offlineSync.addListener(setCount);
    return () => unsubscribe();
  }, []);

  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'orange',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  text: {
    color: '#000',
    fontSize: 12,
  },
});

export default QueueStatusBadge;
