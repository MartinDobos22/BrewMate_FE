// premiumTheme.ts

import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * 🎨 PREMIUM COLOR PALETTE
 */
export const PREMIUM_COLORS = {
    // Primary Coffee Tones
    espresso: {
        dark: '#1A0E08',
        medium: '#2C1810',
        light: '#3E2417',
        ultraLight: '#4A2F1F',
    },

    // Cream & Milk Tones
    cream: {
        dark: '#C4A574',
        medium: '#D4A574',
        light: '#E4C5A4',
        ultraLight: '#F5E6D3',
    },

    // Accent Colors
    cinnamon: '#C65D00',
    caramel: '#D2691E',
    chocolate: '#7B3F00',
    vanilla: '#F3E5AB',

    // Gradients
    gradients: {
        morningBrew: ['#FFD89B', '#F5A623', '#D4A574'],
        espressoFlow: ['#2C1810', '#5D4037', '#8D6E63'],
        latteSwirl: ['#F5E6D3', '#D4A574', '#C65D00'],
        coldBrew: ['#37474F', '#455A64', '#607D8B'],
        sunset: ['#FF6B6B', '#FF8E53', '#FFB74D'],
        ocean: ['#667EEA', '#764BA2', '#F093FB'],
    },

    // Semantic Colors
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',

    // Glass Morphism
    glass: {
        light: 'rgba(255, 255, 255, 0.25)',
        medium: 'rgba(255, 255, 255, 0.45)',
        dark: 'rgba(0, 0, 0, 0.25)',
        ultraDark: 'rgba(0, 0, 0, 0.45)',
    },
};

/**
 * 🎭 PREMIUM SHADOWS & EFFECTS
 */
export const PREMIUM_SHADOWS = {
    small: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },

    medium: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },

    large: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            android: {
                elevation: 12,
            },
        }),
    },

    xlarge: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.20,
                shadowRadius: 24,
            },
            android: {
                elevation: 18,
            },
        }),
    },

    glow: (color: string) => ({
        ...Platform.select({
            ios: {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    }),
};

/**
 * 🏗 PREMIUM COMPONENT STYLES
 */
export const PREMIUM_COMPONENTS = {

    /**
     * Glass Card with Gradient Border
     */
    glassCard: (isDark: boolean) => ({
        backgroundColor: isDark ? PREMIUM_COLORS.glass.dark : PREMIUM_COLORS.glass.light,
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDark
            ? 'rgba(212, 165, 116, 0.3)'
            : 'rgba(255, 255, 255, 0.5)',
        padding: 20,
        ...PREMIUM_SHADOWS.medium,
    }),

    /**
     * Neumorphic Button
     */
    neumorphicButton: (isDark: boolean, pressed: boolean = false) => ({
        backgroundColor: isDark ? '#2C1810' : '#F5E6D3',
        borderRadius: 20,
        padding: 16,
        ...(!pressed ? {
            ...Platform.select({
                ios: {
                    shadowColor: isDark ? '#000' : '#C4A574',
                    shadowOffset: { width: 4, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                },
                android: {
                    elevation: 8,
                },
            }),
        } : {
            ...Platform.select({
                ios: {
                    shadowColor: isDark ? '#000' : '#C4A574',
                    shadowOffset: { width: -2, height: -2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                },
                android: {
                    elevation: 2,
                },
            }),
        }),
    }),

    /**
     * Gradient Button
     */
    gradientButton: {
        borderRadius: 16,
        overflow: 'hidden',
        ...PREMIUM_SHADOWS.medium,
    },

    /**
     * Chat Bubble
     */
    chatBubble: (isUser: boolean, isDark: boolean) => ({
        maxWidth: width * 0.75,
        padding: 16,
        borderRadius: 20,
        marginVertical: 4,
        ...(isUser ? {
            alignSelf: 'flex-end',
            backgroundColor: isDark ? PREMIUM_COLORS.cream.dark : PREMIUM_COLORS.cream.medium,
            borderBottomRightRadius: 4,
        } : {
            alignSelf: 'flex-start',
            backgroundColor: isDark ? PREMIUM_COLORS.glass.dark : '#FFFFFF',
            borderBottomLeftRadius: 4,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.1)',
        }),
        ...PREMIUM_SHADOWS.small,
    }),

    /**
     * Floating Action Button
     */
    fab: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        ...PREMIUM_SHADOWS.large,
    },

    /**
     * Premium Input Field
     */
    premiumInput: (isDark: boolean, focused: boolean = false) => ({
        backgroundColor: isDark ? PREMIUM_COLORS.glass.dark : '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 14,
        fontSize: 16,
        borderWidth: 2,
        borderColor: focused
            ? PREMIUM_COLORS.cream.medium
            : isDark ? 'rgba(212, 165, 116, 0.2)' : 'rgba(139, 69, 19, 0.1)',
        ...PREMIUM_SHADOWS.small,
    }),

    /**
     * Section Header
     */
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },

    /**
     * Badge
     */
    badge: (type: 'success' | 'warning' | 'error' | 'info') => ({
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: PREMIUM_COLORS[type],
        alignSelf: 'flex-start',
    }),
};

/**
 * 🎬 ANIMATIONS CONFIG
 */
export const ANIMATIONS = {
    timing: {
        fast: 200,
        normal: 300,
        slow: 500,
    },

    spring: {
        standard: {
            friction: 7,
            tension: 40,
        },
        bouncy: {
            friction: 3,
            tension: 40,
        },
        stiff: {
            friction: 20,
            tension: 200,
        },
    },

    easing: {
        in: 'ease-in',
        out: 'ease-out',
        inOut: 'ease-in-out',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
};

/**
 * 🔤 TYPOGRAPHY
 */
export const TYPOGRAPHY = {
    fontFamily: {
        regular: 'Inter-Regular',
        medium: 'Inter-Medium',
        semiBold: 'Inter-SemiBold',
        bold: 'Inter-Bold',
        serif: 'PlayfairDisplay-Regular',
        serifBold: 'PlayfairDisplay-Bold',
        script: 'DancingScript-Regular',
    },

    sizes: {
        tiny: 10,
        small: 12,
        regular: 14,
        medium: 16,
        large: 18,
        xlarge: 24,
        xxlarge: 32,
        huge: 48,
    },

    lineHeights: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
        loose: 2,
    },
};

/**
 * 📐 SPACING & LAYOUT
 */
export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const BORDER_RADIUS = {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
    round: 999,
};

/**
 * 🎯 COMPONENT SPECIFIC STYLES
 */
export const HOME_SCREEN_PREMIUM = {
    container: {
        flex: 1,
        backgroundColor: PREMIUM_COLORS.cream.ultraLight,
    },

    scrollContent: {
        paddingBottom: 100,
    },

    welcomeCard: {
        margin: SPACING.md,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xlarge,
        overflow: 'hidden',
    },

    coffeeCard: {
        width: 160,
        marginRight: SPACING.md,
        borderRadius: BORDER_RADIUS.large,
        overflow: 'hidden',
        ...PREMIUM_SHADOWS.medium,
    },

    weatherWidget: {
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.large,
        ...PREMIUM_SHADOWS.small,
    },

    actionCard: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.large,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
        ...PREMIUM_SHADOWS.medium,
    },

    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: SPACING.md,
        paddingBottom: Platform.OS === 'ios' ? 28 : SPACING.md,
        flexDirection: 'row',
        justifyContent: 'space-around',
        ...PREMIUM_SHADOWS.xlarge,
    },
};

/**
 * 🛠 UTILITY FUNCTIONS
 */
export const createLinearGradient = (colors: string[], start = { x: 0, y: 0 }, end = { x: 1, y: 1 }) => ({
    colors,
    start,
    end,
});

export const getAdaptiveColor = (isDark: boolean, lightColor: string, darkColor: string) =>
    isDark ? darkColor : lightColor;

export const createBlurredBackground = (isDark: boolean) => ({
    backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
});