import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { Colors } from '../../theme/colors';

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
    messageText: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
  });

const RecipeHistoryDetailScreen: React.FC = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>História receptov</Text>
        <Text style={styles.heroMeta}>Podrobnosti receptu sú momentálne skryté.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chuťový profil</Text>
        <Text style={styles.sectionText}>
          Obsah receptov a chuťové poznámky sa momentálne nezobrazujú.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recept</Text>
        <Text style={styles.messageText}>
          Táto obrazovka zostáva dostupná, no bez výsledkov skenovania alebo uložených údajov.
        </Text>
      </View>
    </ScrollView>
  );
};

export default RecipeHistoryDetailScreen;
