import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Tip } from '../../services/contentServices';
import { loadSavedTips, persistSavedTips, removeSavedTip } from './services';
import { styles } from './styles';

const SavedTipsScreen: React.FC = () => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const saved = await loadSavedTips();
      setTips(saved);
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
    const updated = removeSavedTip(tips, id, date);
    setTips(updated);
    try {
      await persistSavedTips(updated);
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

export default SavedTipsScreen;
