import React, { useMemo, useState } from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  openSettings,
  requestMultiple,
} from 'react-native-permissions';
import LinearGradient from 'react-native-linear-gradient';
import { useWindowDimensions } from 'react-native';
import { useTheme } from 'theme/ThemeProvider.tsx';
import OnboardingButton from './components/OnboardingButton';
import {
  getElevationStyle,
  getOnboardingPalette,
  radius,
  spacing,
} from './onboardingPalette';

interface Props {
  navigation: any;
}

const PermissionsScreen: React.FC<Props> = ({ navigation }) => {
  const { isDark } = useTheme();
  const [denied, setDenied] = useState(false);
  const palette = useMemo(() => getOnboardingPalette(isDark), [isDark]);
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;

  const requestPerms = async () => {
    setDenied(false);
    const permissions = Platform.select({
      ios: [PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.PHOTO_LIBRARY],
      android: [
        PERMISSIONS.ANDROID.CAMERA,
        Platform.Version >= 33
          ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
          : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
      ],
    }) as string[];

    const statuses = await requestMultiple(permissions);
    const granted = Object.values(statuses).every((s) => s === RESULTS.GRANTED);
    if (granted) {
      navigation.navigate('Features');
    } else {
      const blocked = Object.values(statuses).some((s) => s === RESULTS.BLOCKED);
      if (blocked) {
        await openSettings();
      } else {
        setDenied(true);
      }
    }
  };

  return (
    <LinearGradient colors={palette.backgroundGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, isLarge && styles.contentLarge]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.hero,
              {
                backgroundColor: palette.primarySurface,
                borderColor: palette.surfaceBorder,
              },
              getElevationStyle(palette, 'high'),
            ]}
          >
            <Text style={[styles.heroEyebrow, { color: palette.secondaryAccent }]}>Bezpečné prostredie</Text>
            <Text style={[styles.heroTitle, { color: palette.primaryText }]}>Dovoľ BrewMate zachytiť tvoje pivné momenty</Text>
            <Text style={[styles.heroSubtitle, { color: palette.secondaryText }]}>Skenovanie etikiet a galéria poznámok vyžadujú prístup ku kamere a médiám. Všetky dáta ostávajú bezpečne u teba.</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: palette.secondarySurface,
                    borderColor: palette.surfaceBorder,
                  },
                  getElevationStyle(palette, 'low'),
                ]}
              >
                <Text style={[styles.statusTitle, { color: palette.primaryText }]}>Kamera</Text>
                <Text style={[styles.statusBody, { color: palette.mutedText }]}>Fotografovanie etikiet a AR prvkov.</Text>
              </View>
              <View
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: palette.secondarySurface,
                    borderColor: palette.surfaceBorder,
                  },
                  getElevationStyle(palette, 'low'),
                ]}
              >
                <Text style={[styles.statusTitle, { color: palette.primaryText }]}>Médiá</Text>
                <Text style={[styles.statusBody, { color: palette.mutedText }]}>Ukladanie tasting poznámok do galérie.</Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: palette.primarySurface,
                borderColor: palette.surfaceBorder,
              },
              getElevationStyle(palette, 'medium'),
            ]}
          >
            {denied ? (
              <Text style={[styles.warning, { color: palette.warning }]}>Povolenia boli odmietnuté. Skús to znova alebo otvor nastavenia.</Text>
            ) : (
              <Text style={[styles.info, { color: palette.secondaryText }]}>Materiálové karty s vyššou eleváciou upozorňujú na dôležitosť akcie. Pridali sme mäkké tieňovanie pre jemný 3D efekt.</Text>
            )}

            <View style={styles.actions}>
              <OnboardingButton
                label={denied ? 'Skúsiť znova' : 'Udelit povolenia'}
                onPress={requestPerms}
                palette={palette}
                style={styles.primaryAction}
              />
              <OnboardingButton
                label="Neskôr"
                onPress={() => navigation.navigate('Features')}
                palette={palette}
                variant="tonal"
                style={styles.secondaryAction}
              />
            </View>

            <View
              style={[
                styles.helperCard,
                {
                  backgroundColor: palette.secondarySurface,
                  borderColor: palette.surfaceBorder,
                },
                getElevationStyle(palette, 'low'),
              ]}
            >
              <Text style={[styles.helperTitle, { color: palette.primaryText }]}>Tip na animáciu</Text>
              <Text style={[styles.helperBody, { color: palette.mutedText }]}>Pri udelení povolení jemne zväčši CTA tlačidlo (scale 1 → 1.05 → 1) a nechaj ikonky v kartách pulzovať pre potvrdenie.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  contentLarge: {
    maxWidth: 720,
    alignSelf: 'center',
  },
  hero: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroEyebrow: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statusCard: {
    flex: 1,
    minWidth: 140,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  warning: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  info: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  primaryAction: {
    flexGrow: 1,
  },
  secondaryAction: {
    flexGrow: 1,
  },
  helperCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  helperTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  helperBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default PermissionsScreen;
