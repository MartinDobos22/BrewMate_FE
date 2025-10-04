import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tip } from '../services/contentServices';

const SAVED_TIPS_KEY = 'SavedTips';

const SavedTipsScreen: React.FC = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await AsyncStorage.getItem(SAVED_TIPS_KEY);
      setTips(raw ? JSON.parse(raw) : []);
    } catch (err) {
      console.error('SavedTipsScreen: failed to load tips', err);
      setTips([]);
      setError('Nepodarilo sa načítať tipy. Skúste to znova.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTips();
  }, [loadTips]);

  const removeTip = async (id: number, date: string) => {
    const updated = tips.filter((t) => !(t.id === id && t.date === date));
    setTips(updated);
    try {
      await AsyncStorage.setItem(SAVED_TIPS_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('SavedTipsScreen: failed to persist tips', err);
      setError('Nepodarilo sa uložiť zmeny. Skúste to znova.');
      await loadTips();
    }
  };

  const renderItem = ({ item }: { item: Tip }) => (
    <View style={styles.tipCard}>
      <Text style={styles.tipDate}>{item.date}</Text>
      <Text style={styles.tipText}>{item.text}</Text>
      <TouchableOpacity onPress={() => removeTip(item.id, item.date)} style={styles.removeButton}>
        <Text style={styles.removeButtonText}>Odstrániť</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.stateContainer} testID="saved-tips-loading">
          <ActivityIndicator color="#6B4423" />
          <Text style={styles.stateText}>Načítavam tipy...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer} testID="saved-tips-error">
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadTips}
            activeOpacity={0.85}
            testID="saved-tips-retry"
          >
            <Text style={styles.retryText}>Skúsiť znova</Text>
          </TouchableOpacity>
        </View>
      ) : tips.length === 0 ? (
        <View style={styles.stateContainer} testID="saved-tips-empty">
          <Text style={styles.stateText}>Nemáš uložené žiadne tipy.</Text>
        </View>
      ) : (
        <FlatList
          data={tips}
          keyExtractor={(item) => `${item.id}-${item.date}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#2C2C2C',
  },
  retryButton: {
    backgroundColor: '#6B4423',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  tipCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  tipDate: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  removeButton: {
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: '#EF5350',
    fontWeight: '600',
  },
});

export default SavedTipsScreen;
