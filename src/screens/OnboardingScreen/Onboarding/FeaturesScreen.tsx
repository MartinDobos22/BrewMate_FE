import React, { useMemo, useRef } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from 'theme/ThemeProvider.tsx';
import OnboardingButton from './components/OnboardingButton';
import {
  getElevationStyle,
  getOnboardingPalette,
  radius,
  spacing,
} from './onboardingPalette';

interface SlideContent {
  key: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  points: string[];
  tip: string;
  responsive: string;
}

interface Props {
  onFinish: () => void;
}

const FeaturesScreen: React.FC<Props> = ({ onFinish }) => {
  const { isDark } = useTheme();
  const palette = useMemo(() => getOnboardingPalette(isDark), [isDark]);
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;
  const cardWidth = Math.min(width * 0.9, 720);
  const spacer = (width - cardWidth) / 2;

  const slides: SlideContent[] = useMemo(
    () => [
      {
        key: 'welcome',
        eyebrow: 'Crafted onboarding',
        title: 'Vitaj v degustácii BrewMate',
        subtitle: 'Objavovanie & prvý dojem',
        description:
          'Spoznaj BrewMate prostredníctvom vrstveného Material You dizajnu, ktorý kombinuje kávové tóny so žiarivými akcentmi.',
        points: [
          'Hero karta s vyššou eleváciou a priehľadnou vrstvou',
          'Ambientné svetlo zvýrazňuje CTA a ilustráciu',
          'CTA s kontrastným akcentom pre jasnú hierarchiu',
        ],
        tip: 'Tip: Pri prvom načítaní použi jemný fade-in a parallax na pozadí kávových textúr.',
        responsive:
          'Mobil: obsah centrovaný s vertikálnym stackingom. Tablet: text zarovnaj doľava a ilustráciu vycentruj doprava.',
      },
      {
        key: 'personalization',
        eyebrow: 'Personalizačný engine',
        title: 'Zvoľ svoje chuťové preferencie',
        subtitle: 'Personalizované odporúčania',
        description:
          'Interaktívne karty a chipsy ti pomôžu definovať štýl, intenzitu a náladu degustácie.',
        points: [
          'Dynamické karty s menšou eleváciou a jemným stmievaním',
          'Jasné CTA “Pokračovať” vždy v spodnej časti karty',
          'Adaptívne rozloženie možností podľa šírky zariadenia',
        ],
        tip: 'Tip: Pri výbere chuti zvýrazni kartu scale animáciou a tieňom.',
        responsive:
          'Mobil: horizontálne scrollovateľné chipsy. Tablet: mriežka 2×2 s väčšími kartami.',
      },
      {
        key: 'community',
        eyebrow: 'Komunitné rituály',
        title: 'Zapoj sa do komunity a odmien',
        subtitle: 'Recenzie & vernosť',
        description:
          'Zdieľaj hodnotenia, sleduj priateľov a zbieraj body v BrewMate klube s ambientným 3D pozadím.',
        points: [
          'Ikony a micro-karty s nižšou eleváciou v espresso tónoch',
          'Sekundárne CTA zvýraznené teplým koralovým akcentom',
          'Progress indikátor vernostných odmien v spodnej časti',
        ],
        tip: 'Tip: Spusť jemný shimmer cez badge pri získaní novej odmeny.',
        responsive:
          'Mobil: carousel s kartami na celú šírku. Tablet: dvojsĺpcový layout so zvýrazneným rankingom.',
      },
      {
        key: 'cta',
        eyebrow: 'Hotovo pripravené',
        title: 'Začni svoj tasting profil',
        subtitle: 'CTA & ďalší krok',
        description:
          'Dokonči onboarding a prenes sa do personalizovaných odporúčaní. Materiálová elevácia vedie pohľad priamo na akciu.',
        points: [
          'CTA karta s najvyššou eleváciou a gradientným halo',
          'Sekundárny text vysvetľuje, čo nasleduje po kliknutí',
          'Mini zhrnutie krokov onboardingového procesu',
        ],
        tip: 'Tip: Pri stlačení CTA nech sa tlačidlo mierne prepadne a gradient vytvorí ripple efekt.',
        responsive:
          'Mobil: CTA v strede so spodným offsetom. Tablet: CTA zarovnaj doprava s doplnkovým textom vľavo.',
      },
    ],
    [],
  );

  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 55 }).current;

  return (
    <LinearGradient colors={palette.backgroundGradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.decorLayerContainer}>
          <LinearGradient
            colors={[palette.primaryAccent, 'transparent']}
            style={[styles.decorOval, { top: -80, right: -60 }]}
          />
          <LinearGradient
            colors={[palette.secondaryAccent, 'transparent']}
            style={[styles.decorOval, { bottom: -60, left: -40, transform: [{ rotate: '-22deg' }] }]}
          />
        </View>
        <Animated.FlatList
          data={slides}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          contentContainerStyle={{ paddingHorizontal: spacer }}
          renderItem={({ item, index: itemIndex }) => (
            <View style={{ width: cardWidth }}>
              <ScrollView
                style={styles.cardScroll}
                contentContainerStyle={styles.cardScrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View
                  style={[
                    styles.card,
                    styles.cardInner,
                    {
                      backgroundColor: palette.primarySurface,
                      borderColor: palette.surfaceBorder,
                    },
                    getElevationStyle(palette, 'high'),
                    isLarge && styles.cardLarge,
                  ]}
                >
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: palette.secondarySurface,
                        borderColor: palette.surfaceBorder,
                      },
                      getElevationStyle(palette, 'low'),
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: palette.secondaryText }]}>{item.eyebrow}</Text>
                  </View>
                  <Text style={[styles.title, { color: palette.primaryText }]}>{item.title}</Text>
                  <Text style={[styles.subtitle, { color: palette.secondaryAccent }]}>{item.subtitle}</Text>
                  <Text style={[styles.description, { color: palette.secondaryText }]}>{item.description}</Text>
                  <View style={styles.pointList}>
                    {item.points.map((point) => (
                      <View key={point} style={styles.pointRow}>
                        <View
                          style={[styles.pointBullet, { backgroundColor: palette.primaryAccent }]}
                        />
                        <Text style={[styles.pointText, { color: palette.secondaryText }]}>{point}</Text>
                      </View>
                    ))}
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
                    <Text style={[styles.helperTitle, { color: palette.primaryText }]}>{item.tip}</Text>
                  </View>
                  <View
                    style={[
                      styles.responsiveCard,
                      {
                        backgroundColor: palette.tertiarySurface,
                      },
                      getElevationStyle(palette, 'low'),
                    ]}
                  >
                    <Text style={[styles.responsiveTitle, { color: palette.primaryText }]}>Adaptácia na breakpoints</Text>
                    <Text style={[styles.responsiveBody, { color: palette.mutedText }]}>{item.responsive}</Text>
                  </View>
                  {itemIndex === slides.length - 1 ? <View style={styles.ctaSpacer} /> : null}
                  {itemIndex === slides.length - 1 ? (
                    <OnboardingButton
                      label="Začať tasting profil"
                      onPress={onFinish}
                      palette={palette}
                      style={styles.cta}
                    />
                  ) : null}
                </View>
              </ScrollView>
            </View>
          )}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
        <View style={styles.pagination}>
          {slides.map((_, slideIndex) => {
            const inputRange = [
              (slideIndex - 1) * width,
              slideIndex * width,
              (slideIndex + 1) * width,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [12, 28, 12],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={slideIndex}
                style={[
                  styles.dot,
                  {
                    backgroundColor: palette.primaryAccent,
                    width: dotWidth,
                    opacity: dotOpacity,
                  },
                ]}
              />
            );
          })}
        </View>
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
  decorLayerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  decorOval: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.3,
    transform: [{ rotate: '18deg' }],
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  cardInner: {
    flexGrow: 1,
  },
  cardScroll: {
    flexGrow: 1,
  },
  cardScrollContent: {
    flexGrow: 1,
  },
  cardLarge: {
    padding: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 13,
    letterSpacing: 0.6,
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  pointList: {
    gap: spacing.sm,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  pointBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: spacing.xs,
  },
  pointText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  helperCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  helperTitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  responsiveCard: {
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  responsiveTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  responsiveBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaSpacer: {
    flexGrow: 1,
  },
  cta: {
    marginTop: spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
});

export default FeaturesScreen;
