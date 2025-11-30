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

  const flavorNotes = Array.isArray(scan.flavor_notes)
    ? scan.flavor_notes.filter((note): note is string => typeof note === 'string')
    : typeof scan.flavor_notes === 'string'
      ? [scan.flavor_notes]
      : [];

  const detailRows: { label: string; value?: string | number | null }[] = [
    { label: 'Pražiareň / Značka', value: scan.brand },
    { label: 'Pôvod', value: scan.origin },
    { label: 'Praženie', value: scan.roast_level },
    { label: 'Zhoda s profilom', value: scan.match_percentage ? `${scan.match_percentage}%` : null },
    { label: 'Hodnotenie', value: typeof scan.rating === 'number' ? `${scan.rating}/5` : null },
    { label: 'Odporúčanie AI', value: scan.is_recommended === false ? 'Skôr NIE' : scan.is_recommended ? 'Skôr ÁNO' : null },
    { label: 'Obľúbená', value: scan.is_favorite ? 'Áno' : null },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{scan.coffee_name || 'Neznáma káva'}</Text>
        {scan.created_at ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {new Date(scan.created_at).toLocaleString('sk-SK')}
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
        <Text style={[styles.body, { color: colors.text }]}>{scan.corrected_text || scan.original_text}</Text>
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
