// UserProfile.styles.ts
import { StyleSheet, Platform, Dimensions } from 'react-native';
import { scale, verticalScale } from '../../theme/responsive';

const { width } = Dimensions.get('window');

const colors = {
    primary: '#6B4423',
    primaryLight: '#8B6544',
    primaryDark: '#4A2F18',
    accent: '#D2691E',
    success: '#4CAF50',
    warning: '#FFA726',
    danger: '#EF5350',
    bgLight: '#FAF7F5',
    bgDark: '#1A1A1A',
    cardLight: '#FFFFFF',
    cardDark: '#2A2A2A',
    textPrimary: '#2C2C2C',
    textSecondary: '#666666',
    borderLight: '#E0E0E0',
};

export const userProfileStyles = () => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.bgLight,
        },

        // Header
        header: {
            backgroundColor: colors.primary,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: scale(20),
            paddingVertical: verticalScale(16),
            paddingTop: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(16),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 5,
        },
        headerTitle: {
            color: 'white',
            fontSize: 20,
            fontWeight: '700',
            letterSpacing: -0.5,
        },
        backButton: {
            width: 36,
            height: 36,
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
        },
        backButtonText: {
            color: 'white',
            fontSize: 18,
            fontWeight: '600',
        },
        headerPlaceholder: {
            width: 36,
        },

        // Loading & Error States
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.bgLight,
            padding: 20,
        },
        loadingCard: {
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 30,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 8,
            width: width * 0.8,
        },
        loadingText: {
            marginTop: verticalScale(15),
            fontSize: 16,
            color: colors.textSecondary,
            fontWeight: '500',
        },
        errorContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.bgLight,
            padding: 20,
        },
        errorCard: {
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 30,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 8,
            width: width * 0.85,
        },
        errorEmoji: {
            fontSize: 60,
            marginBottom: verticalScale(20),
        },
        errorText: {
            fontSize: 18,
            color: colors.textPrimary,
            marginBottom: verticalScale(20),
            textAlign: 'center',
            fontWeight: '600',
        },
        retryButton: {
            backgroundColor: colors.primary,
            paddingHorizontal: 30,
            paddingVertical: verticalScale(14),
            borderRadius: 25,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        },
        retryButtonText: {
            color: 'white',
            fontWeight: '700',
            fontSize: 16,
        },

        // Scroll View
        scrollView: {
            flex: 1,
        },

        // Profile Header
        profileHeaderCard: {
            backgroundColor: 'white',
            margin: 16,
            borderRadius: 20,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 8,
        },
        avatar: {
            width: 100,
            height: 100,
            borderRadius: 50,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: verticalScale(16),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
        },
        avatarText: {
            fontSize: 36,
            fontWeight: '700',
            color: 'white',
        },
        profileName: {
            fontSize: 24,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: verticalScale(6),
            textAlign: 'center',
        },
        profileEmail: {
            fontSize: 16,
            color: colors.textSecondary,
            marginBottom: verticalScale(16),
            textAlign: 'center',
        },
        levelBadge: {
            paddingHorizontal: 20,
            paddingVertical: verticalScale(10),
            borderRadius: 25,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
        },
        levelBadgeText: {
            color: 'white',
            fontWeight: '700',
            fontSize: 14,
            letterSpacing: 0.5,
        },

        // Quick Actions
        quickActions: {
            flexDirection: 'row',
            marginHorizontal: 16,
            marginBottom: verticalScale(20),
            gap: 12,
        },
        actionButton: {
            flex: 1,
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
        },
        primaryActionButton: {
            backgroundColor: colors.primary,
        },
        secondaryActionButton: {
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: colors.borderLight,
        },
        actionIcon: {
            width: 48,
            height: 48,
            backgroundColor: 'rgba(107, 68, 35, 0.1)',
            borderRadius: 16,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: verticalScale(12),
        },
        actionIconPrimary: {
            backgroundColor: 'rgba(255,255,255,0.2)',
        },
        actionEmoji: {
            fontSize: 24,
        },
        actionButtonText: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.textPrimary,
            textAlign: 'center',
        },
        actionButtonTextPrimary: {
            color: 'white',
        },

        // Stats Section
        statsSection: {
            marginHorizontal: 16,
            marginBottom: verticalScale(20),
        },
        sectionCard: {
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: verticalScale(16),
        },
        statsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'space-between',
        },
        statCard: {
            width: (width - 52) / 3,
            minWidth: 95,
            backgroundColor: colors.bgLight,
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.borderLight,
        },
        statEmoji: {
            fontSize: 24,
            marginBottom: verticalScale(8),
        },
        statValue: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.primary,
            marginBottom: verticalScale(4),
            textAlign: 'center',
        },
        statLabel: {
            fontSize: 11,
            color: colors.textSecondary,
            textAlign: 'center',
            fontWeight: '500',
        },

        // Recommendation Section
        recommendationSection: {
            marginHorizontal: 16,
            marginBottom: verticalScale(20),
        },
        recommendationHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: verticalScale(16),
        },
        refreshButton: {
            width: 36,
            height: 36,
            backgroundColor: 'rgba(107, 68, 35, 0.1)',
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
        },
        refreshText: {
            fontSize: 18,
        },
        recommendationCard: {
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
            maxHeight: 300,
        },
        recommendationScroll: {
            maxHeight: 250,
        },
        recommendationText: {
            fontSize: 15,
            lineHeight: 24,
            color: colors.textPrimary,
        },

        // Tips Section
        tipsSection: {
            marginHorizontal: 16,
            marginBottom: verticalScale(20),
        },
        tipCard: {
            backgroundColor: colors.accent,
            borderRadius: 20,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 8,
        },
        tipText: {
            fontSize: 14,
            lineHeight: 22,
            color: 'white',
            textAlign: 'center',
        },

        // Footer
        footer: {
            marginHorizontal: 16,
            marginBottom: verticalScale(30),
            paddingVertical: verticalScale(20),
            alignItems: 'center',
        },
        footerText: {
            fontSize: 12,
            color: colors.textSecondary,
            fontWeight: '500',
        },

        // Experience Level Colors
        experienceBeginner: {
            backgroundColor: colors.success,
        },
        experienceIntermediate: {
            backgroundColor: colors.warning,
        },
        experienceExpert: {
            backgroundColor: '#9C27B0',
        },
        experienceDefault: {
            backgroundColor: colors.textSecondary,
        },

        // Responsive adjustments
        smallScreen: {
            paddingHorizontal: 12,
        },
        largeScreen: {
            paddingHorizontal: 24,
        },
    });
};