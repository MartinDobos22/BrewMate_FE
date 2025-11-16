import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { RecipeDetail as RecipeDetailType, RecipeParameters } from '../../types/Recipe';

const FOOTER_HEIGHT = 112;

type FooterAction = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
};

export interface RecipeDetailProps {
  recipe: RecipeDetailType;
  onBack?: () => void;
  onStart?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onLikeToggle?: (liked: boolean) => void;
  onRatingChange?: (rating: number) => void;
  footerActions?: FooterAction[];
}

const PARAMETER_META: { key: keyof RecipeParameters; label: string; icon: string }[] = [
  { key: 'dose', label: 'Dávka', icon: '⚖️' },
  { key: 'ratio', label: 'Pomer', icon: '⚗️' },
  { key: 'temperature', label: 'Teplota', icon: '🌡️' },
  { key: 'time', label: 'Čas', icon: '⏱️' },
];

const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  onBack,
  onStart,
  onSave,
  onShare,
  onLikeToggle,
  onRatingChange,
  footerActions,
}) => {
  const { colors } = useTheme();
  const [liked, setLiked] = useState<boolean>(recipe.liked ?? false);
  const [rating, setRating] = useState<number>(recipe.rating ?? 0);

  const handleLikeToggle = () => {
    const nextValue = !liked;
    setLiked(nextValue);
    onLikeToggle?.(nextValue);
  };

  const handleRating = (value: number) => {
    setRating(value);
    onRatingChange?.(value);
  };

  const actions = useMemo<FooterAction[]>(() => {
    if (footerActions && footerActions.length > 0) {
      return footerActions;
    }
    return [
      { label: 'Spustiť časovač', onPress: onStart, variant: 'primary' },
      { label: 'Uložiť recept', onPress: onSave, variant: 'secondary' },
    ];
  }, [footerActions, onSave, onStart]);

  const handleShare = () => {
    onShare?.();
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: FOOTER_HEIGHT + 32 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={[styles.backButton, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Späť"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Recept</Text>
            <Text style={[styles.title, { color: colors.text }]}>{recipe.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{recipe.brewDevice}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleLikeToggle} style={styles.iconButton} accessibilityRole="button">
              <Text style={[styles.iconButtonText, liked && styles.iconButtonActive]}>{liked ? '❤️' : '🤎'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.iconButton} accessibilityRole="button">
              <Text style={styles.iconButtonText}>🔗</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Parametre</Text>
          <View style={styles.parametersRow}>
            {PARAMETER_META.map(({ key, label, icon }) => {
              const value = recipe.parameters?.[key as keyof typeof recipe.parameters];
              return (
                <View key={key} style={styles.parameterCard}>
                  <Text style={styles.parameterIcon}>{icon}</Text>
                  <Text style={[styles.parameterLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <Text style={[styles.parameterValue, { color: colors.text }]}>{value || '—'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Postup</Text>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {recipe.steps?.length ?? 0} krokov
            </Text>
          </View>
          {recipe.steps?.map((step, index) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{index + 1}</Text>
              </View>
              <View style={styles.stepContent}>
                {step.title ? (
                  <Text style={[styles.stepTitle, { color: colors.textSecondary }]}>{step.title}</Text>
                ) : null}
                <Text style={[styles.stepDescription, { color: colors.text }]}>{step.description}</Text>
                {step.durationSeconds ? (
                  <Text style={[styles.stepDuration, { color: colors.textSecondary }]}>⏱️ {Math.round(step.durationSeconds)} s</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {recipe.notes && recipe.notes.length > 0 ? (
          <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Poznámky</Text>
            {recipe.notes.map((note) => (
              <View key={note} style={styles.noteRow}>
                <Text style={styles.noteIcon}>💡</Text>
                <Text style={[styles.noteText, { color: colors.textSecondary }]}>{note}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hodnotenie</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => handleRating(value)}
                style={styles.ratingStar}
                accessibilityRole="button"
                accessibilityLabel={`Hodnotenie ${value}`}
              >
                <Text style={styles.ratingStarText}>{value <= rating ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.label}
            onPress={action.onPress ?? (() => {})}
            style={[styles.footerButton, action.variant === 'primary' ? styles.footerButtonPrimary : styles.footerButtonSecondary]}
            activeOpacity={0.9}
          >
            <Text
              style={[
                styles.footerButtonText,
                action.variant === 'primary' ? styles.footerButtonTextPrimary : styles.footerButtonTextSecondary,
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  backButtonText: {
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 18,
  },
  iconButtonActive: {
    color: '#C62828',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  parametersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  parameterCard: {
    flexBasis: '48%',
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  parameterIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  parameterLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  parameterValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(111, 78, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    fontWeight: '700',
    color: '#6F4E37',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
  },
  stepDuration: {
    fontSize: 12,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
  },
  noteIcon: {
    fontSize: 18,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  ratingStar: {
    padding: 6,
  },
  ratingStarText: {
    fontSize: 24,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerButtonPrimary: {
    backgroundColor: '#6F4E37',
  },
  footerButtonSecondary: {
    backgroundColor: 'rgba(111,78,55,0.12)',
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerButtonTextPrimary: {
    color: '#FFFFFF',
  },
  footerButtonTextSecondary: {
    color: '#6F4E37',
  },
});

export default RecipeDetail;
