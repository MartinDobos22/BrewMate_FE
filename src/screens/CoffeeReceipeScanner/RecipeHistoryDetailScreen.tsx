import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RecipeHistory } from '../../services/recipeServices';
import { useTheme } from '../../theme/ThemeProvider';
import type { Colors } from '../../theme/colors';

type RecipeHistoryDetailScreenProps = {
  entry: RecipeHistory;
};

const formatDate = (iso: string): string => {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return iso;
  }
};

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 24,
      paddingBottom: 48,
      backgroundColor: colors.background,
    },
    heroCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 6,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    heroMeta: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    heroDevice: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
    },
    section: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 12,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    sectionText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    recipeLine: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.text,
      marginBottom: 8,
    },
  });

const RecipeHistoryDetailScreen: React.FC<RecipeHistoryDetailScreenProps> = ({ entry }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const recipeLines = useMemo(() => entry.recipe.split('\n'), [entry.recipe]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{entry.method}</Text>
        <Text style={styles.heroMeta}>{formatDate(entry.created_at)}</Text>
        {entry.brewDevice ? (
          <Text style={styles.heroDevice}>Zariadenie: {entry.brewDevice}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chuťový profil</Text>
        <Text style={styles.sectionText}>{entry.taste || 'Neuvedené'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recept</Text>
        {recipeLines.map((line, index) => (
          <Text key={`${line}-${index}`} style={styles.recipeLine}>
            {line.trim().length > 0 ? line : '\u00A0'}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
};

export default RecipeHistoryDetailScreen;
