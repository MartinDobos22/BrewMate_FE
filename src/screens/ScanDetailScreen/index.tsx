import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { type OCRHistory } from '../../services/ocrServices';
import { useTheme } from '../../theme/ThemeProvider';

interface ScanDetailScreenProps {
  scan: OCRHistory;
  onBack?: () => void;
}

const ScanDetailScreen: React.FC<ScanDetailScreenProps> = ({ scan }) => {
  const { colors } = useTheme();

  const flavorNotes = Array.isArray(scan.flavorNotes)
    ? scan.flavorNotes.filter((note): note is string => typeof note === 'string')
    : typeof scan.flavorNotes === 'string'
      ? [scan.flavorNotes]
      : [];

  const detailRows: { label: string; value?: string | number | null }[] = [
    { label: 'Pražiareň / Značka', value: scan.brand },
    { label: 'Pôvod', value: scan.origin },
    { label: 'Praženie', value: scan.roastLevel },
    { label: 'Zhoda s profilom', value: scan.matchPercentage ? `${scan.matchPercentage}%` : null },
    { label: 'Hodnotenie', value: typeof scan.rating === 'number' ? `${scan.rating}/5` : null },
    { label: 'Odporúčanie AI', value: scan.isRecommended === false ? 'Skôr NIE' : scan.isRecommended ? 'Skôr ÁNO' : null },
    { label: 'Obľúbená', value: scan.isFavorite ? 'Áno' : null },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{scan.coffeeName || 'Neznáma káva'}</Text>
        {scan.createdAt ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {new Date(scan.createdAt).toLocaleString('sk-SK')}
          </Text>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Detaily skenu</Text>
        {detailRows
          .filter((row) => row.value)
          .map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.value, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}
        {flavorNotes.length ? (
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Chuťové poznámky</Text>
            <Text style={[styles.value, { color: colors.text }]}>{flavorNotes.join(', ')}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Rozpoznaný text</Text>
        <Text style={[styles.body, { color: colors.text }]}>{scan.correctedText || scan.originalText}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ScanDetailScreen;
