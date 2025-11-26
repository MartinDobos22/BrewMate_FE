import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import tipsData from '../../../content/dailyTips.json';
import type { Tip } from '../../services/contentServices';

/**
 * Displays a curated list of coffee-related tips in place of the former favorites screen.
 *
 * Tips are currently sourced from the bundled `dailyTips.json` file but the layout was
 * designed to be data-source agnostic so it can later load from an API.
 *
 * @returns {JSX.Element} Rendered tips feed.
 */
const TipsScreen: React.FC = () => {
  // Normalize the bundled tips to ensure stable keys and future backend compatibility.
  const tips = useMemo<Tip[]>(() => {
    const source = tipsData as Tip[];
    const mapped = Array.isArray(source)
      ? source.map((tip) => ({
          id: tip.id,
          text: tip.text,
          date: tip.date,
        }))
      : [];
    return mapped;
  }, []);

  const renderItem = ({ item }: { item: Tip }) => (
    <View style={styles.tipCard}>
      <Text style={styles.tipDate}>{item.date}</Text>
      <Text style={styles.tipText}>{item.text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tipy</Text>
      <Text style={styles.subtitle}>
        Inšpiruj sa praktickými tipmi pre lepšie espresso, filtrovanú kávu aj skladovanie zŕn.
      </Text>
      <FlatList
        data={tips}
        keyExtractor={(item) => `${item.id}-${item.date}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F6F1EA',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C1810',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#5D4E37',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 32,
    gap: 12,
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 111, 71, 0.12)',
  },
  tipDate: {
    fontSize: 12,
    color: '#8B7355',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 15,
    color: '#2C1810',
    lineHeight: 20,
  },
});

export default TipsScreen;
