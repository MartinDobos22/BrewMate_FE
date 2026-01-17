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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Opis</Text>
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
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ScanDetailScreen;
