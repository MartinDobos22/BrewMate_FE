import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchOCRHistory, type OCRHistory } from '../../services/ocrServices';
import { useTheme } from '../../theme/ThemeProvider';

interface ScanHistoryScreenProps {
  onBack?: () => void;
  onSelectScan?: (scan: OCRHistory) => void;
}

const ScanHistoryScreen: React.FC<ScanHistoryScreenProps> = ({ onSelectScan }) => {
  const { colors } = useTheme();
  const [history, setHistory] = useState<OCRHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOCRHistory(200);
      const sorted = data.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setHistory(sorted);
    } catch (error) {
      console.warn('ScanHistoryScreen: failed to load history', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: OCRHistory }) => (
    <TouchableOpacity
      style={[styles.item, { borderColor: colors.border }]}
      onPress={() => onSelectScan?.(item)}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnailPlaceholder, { backgroundColor: colors.cardBackground  }]}>
          <Text style={styles.thumbnailEmoji}>☕</Text>
        </View>
      )}
      <View style={styles.itemContent}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.coffee_name || 'Neznáma káva'}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary  }]}>
          {new Date(item.created_at).toLocaleString('sk-SK')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>História skenovaní</Text>
      </View>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyIcon, { color: colors.primary }]}>📷</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Žiadne skeny</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary  }]}>
              Začni skenovať a uvidíš tu svoje výsledky.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 32,
  },
  item: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  thumbnailEmoji: {
    fontSize: 26,
  },
  itemContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  meta: {
    fontSize: 14,
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    marginBottom: 8,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default ScanHistoryScreen;
