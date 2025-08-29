// src/theme/unifiedStyles.ts
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

/**
 * Jednotná paleta farieb pre celú aplikáciu
 */
export const colors = {
  // Primary palette
  primary: '#6B4423',        // Hlavná hnedá (káva)
  primaryLight: '#8B6544',   // Svetlejšia hnedá
  primaryDark: '#4A2F18',    // Tmavšia hnedá

  // Accent colors
  accent: '#D2691E',         // Chocolate orange
  accentLight: '#E8A857',    // Svetlý accent
  accentDark: '#B8540F',     // Tmavý accent

  // Semantic colors
  success: '#4CAF50',        // Zelená pre úspech
  warning: '#FFA726',        // Oranžová pre upozornenie
  danger: '#FF6B6B',         // Červená pre chyby
  info: '#29B6F6',           // Modrá pre info

  // Backgrounds
  background: '#FAF7F5',     // Hlavné pozadie (krémová)
  backgroundDark: '#1A1A1A', // Tmavý režim pozadie
  surface: '#FFFFFF',        // Povrch kariet
  surfaceDark: '#2A2A2A',    // Tmavý režim povrch

  // Text colors
  text: '#2C2C2C',           // Hlavný text
  textSecondary: '#666666',  // Sekundárny text
  textLight: '#999999',      // Svetlý text
  textOnPrimary: '#FFFFFF',  // Text na primárnej farbe

  // Borders & Dividers
  border: '#E0E0E0',         // Hranice
  borderDark: '#3A3A3A',     // Tmavé hranice
  divider: '#F0F0F0',        // Oddeľovače

  // Special
  coffee: {
    espresso: '#3C2414',
    cappuccino: '#C4986B',
    latte: '#E5D4B7',
    americano: '#6F4E37',
  },
};

/**
 * Jednotná typografia
 */
export const typography = {
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },

  // Body text
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },

  // Special text
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
};

/**
 * Spacing system (4px base)
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Border radiuses
 */
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
};

/**
 * Shadows
 */
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
};

/**
 * Jednotné štýly komponentov
 */
export const componentStyles = StyleSheet.create({
  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  cardDark: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },

  // Buttons
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...shadows.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: {
    backgroundColor: colors.danger,
  },
  buttonText: {
    ...typography.button,
    color: colors.textOnPrimary,
  },

  // Input fields
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.text,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },

  // Labels
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  // Lists
  listItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  // Badges
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '600' as const,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '90%',
    maxHeight: '80%',
    ...shadows.xl,
  },

  // Toast/Alert
  toast: {
    position: 'absolute' as const,
    bottom: spacing.xxl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    ...shadows.lg,
  },
  toastText: {
    ...typography.body,
    color: colors.textOnPrimary,
    flex: 1,
  },
});

/**
 * Utility funkcie pre štýly
 */
export const styleUtils = {
  /**
   * Vytvorí štýl pre text s AI formátovaním
   */
  createAITextStyle: (isDark: boolean): TextStyle => ({
    ...typography.body,
    color: isDark ? '#E0E0E0' : colors.text,
    lineHeight: 24,
  }),

  /**
   * Vytvorí štýl pre highlight badge
   */
  createHighlightStyle: (type: 'success' | 'warning' | 'info'): ViewStyle => {
    const bgColors = {
      success: colors.success,
      warning: colors.warning,
      info: colors.info,
    };

    return {
      backgroundColor: bgColors[type],
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    };
  },

  /**
   * Vytvorí gradient background (simulovaný)
   */
  createGradientCard: (isDark: boolean): ViewStyle => ({
    backgroundColor: isDark ? colors.surfaceDark : colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderTopWidth: 4,
    borderTopColor: colors.primary,
    ...shadows.md,
  }),
};

/**
 * Export všetkých štýlov pre použitie v komponentoch
 */
export const unifiedStyles = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  componentStyles,
  styleUtils,
};

export default unifiedStyles;