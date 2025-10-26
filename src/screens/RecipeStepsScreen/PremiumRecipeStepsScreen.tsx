import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  useWindowDimensions,
  Share,
  Platform,
  FlatList,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { useTheme } from '../../theme/ThemeProvider';
import { formatRecipeSteps, RecipeStep } from '../../components/utils/AITextFormatter';
import { BrewDevice } from '../../types/Recipe';
import { incrementProgress } from '../../services/profileServices';
import { premiumCoffeeTheme } from '../../theme/premiumCoffeeTheme';
import type { ViewToken, FlatListProps } from 'react-native';

// Import premium components
import GlassCard from '../../components/recipes/GlassCard';
import PremiumButton from '../../components/recipes/PremiumButton';
import PremiumCircularTimer from '../../components/recipes/PremiumCircularTimer';
import PremiumIngredientChip from '../../components/recipes/PremiumIngredientChip';
import PremiumProgressBar from '../../components/recipes/PremiumProgressBar';

export interface RecipeStepsScreenProps {
  recipe: string;
  brewDevice?: BrewDevice;
  onBack: () => void;
}

type SlideData = {
  id: string;
  type: 'hero' | 'ingredients' | 'step' | 'summary';
  step?: RecipeStep;
  title: string;
  description?: string;
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as React.ComponentType<
  FlatListProps<SlideData>
>;

const PremiumRecipeStepsScreen: React.FC<RecipeStepsScreenProps> = ({
  recipe,
  brewDevice,
  onBack,
}) => {
  const steps = useMemo(() => formatRecipeSteps(recipe).slice(0, 8), [recipe]);

  // Create slides
  const slides = useMemo(() => {
    const allSlides: SlideData[] = [
      {
        id: 'hero',
        type: 'hero',
        title: 'Tvoj Kávový Príbeh',
        description: 'Prejdi každým krokom k dokonalému šálku',
      },
      {
        id: 'ingredients',
        type: 'ingredients',
        title: 'Ingrediencie',
        description: 'Všetko čo potrebuješ pre skvelú kávu',
      },
    ];

    steps.forEach((step, index) => {
      allSlides.push({
        id: `step-${index}`,
        type: 'step',
        step,
        title: step.text,
      });
    });

    allSlides.push({
      id: 'summary',
      type: 'summary',
      title: 'Dokonalé!',
      description: 'Vychut si si túto úžasnú kávu',
    });

    return allSlides;
  }, [steps]);

  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<SlideData> | null>(null);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Shimmer animation for background
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleShare = useCallback(async () => {
    const shareMessage = steps.map((step) => `${step.number}. ${step.text}`).join('\n');

    try {
      await Share.share({
        title: 'BrewMate recept',
        message: shareMessage,
      });
    } catch (err) {
      console.error('Share failed', err);
    }
  }, [steps]);

  const handleComplete = useCallback(async () => {
    try {
      await incrementProgress('recipe', brewDevice || 'generic');
    } catch (e) {
      console.error('Failed to update progress', e);
    }
    onBack();
  }, [brewDevice, onBack]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  const scrollToIndex = (index: number) => {
    flatListRef.current?.scrollToOffset({ offset: index * width, animated: true });
  };

  const isSummary = currentIndex === slides.length - 1;

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const renderSlide = ({ item, index }: { item: SlideData; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const cardScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.92, 1, 0.92],
      extrapolate: 'clamp',
    });
    const cardOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slideWrapper, { width }]}>
        <View style={styles.slidePadding}>
          <Animated.View
            style={[
              { transform: [{ scale: cardScale }], opacity: cardOpacity },
              styles.slideContainer,
            ]}
          >
            {/* Hero slide */}
            {item.type === 'hero' && (
              <GlassCard intensity="medium">
                <View style={styles.heroContent}>
                  <View style={styles.heroIconContainer}>
                    <LinearGradient
                      colors={['#8B6F47', '#B8956A']}
                      style={styles.heroIconGradient}
                    >
                      <Text style={styles.heroIcon}>☕</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.heroTitle}>{item.title}</Text>
                  <Text style={styles.heroDescription}>{item.description}</Text>

                  {/* Decorative elements */}
                  <View style={styles.decorativeDots}>
                    {[0, 1, 2].map((i) => (
                      <View key={i} style={[styles.dot, { opacity: 0.3 - i * 0.1 }]} />
                    ))}
                  </View>
                </View>
              </GlassCard>
            )}

            {/* Ingredients slide */}
            {item.type === 'ingredients' && (
              <GlassCard intensity="light">
                <ScrollView
                  style={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.slideTitle}>{item.title}</Text>
                  <Text style={styles.slideSubtitle}>{item.description}</Text>

                  <View style={styles.ingredientsGrid}>
                    <PremiumIngredientChip
                      icon="☕"
                      name="Káva"
                      amount="18g"
                      tip="Použi stredne praženú kávu pre vyváženú chuť a arómu"
                    />
                    <PremiumIngredientChip
                      icon="💧"
                      name="Voda"
                      amount="300ml"
                      tip="Filtrovaná voda pri 93°C zabezpečí najlepšiu extrakciu"
                    />
                    <PremiumIngredientChip
                      icon="📄"
                      name="Filter"
                      amount="1x"
                      tip="Opláchnuť horúcou vodou pre odstránenie papierového príchuti"
                    />
                  </View>

                  <View style={styles.tipCard}>
                    <Text style={styles.tipIcon}>💡</Text>
                    <Text style={styles.tipText}>
                      Pomer 1:16 (káva:voda) je skvelý štartovací bod. Experimentuj podľa chuti!
                    </Text>
                  </View>
                </ScrollView>
              </GlassCard>
            )}

            {/* Step slide */}
            {item.type === 'step' && item.step && (
              <GlassCard intensity="medium">
                <ScrollView
                  style={styles.stepScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Step header */}
                  <View style={styles.stepHeader}>
                    <View style={styles.stepIconContainer}>
                      <LinearGradient
                        colors={['#8B6F47', '#B8956A']}
                        style={styles.stepIconGradient}
                      >
                        <Text style={styles.stepIcon}>{item.step.icon}</Text>
                      </LinearGradient>
                    </View>
                    <View style={styles.stepHeaderText}>
                      <Text style={styles.stepNumber}>Krok {item.step.number}</Text>
                      {item.step.time && (
                        <View style={styles.timeTag}>
                          <Text style={styles.timeTagText}>⏱ {item.step.time}s</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Step content */}
                  <Text style={styles.stepText}>{item.step.text}</Text>

                  {/* Timer */}
                  {item.step.time && (
                    <View style={styles.timerContainer}>
                      <PremiumCircularTimer seconds={item.step.time} autoStart={false} />
                    </View>
                  )}

                  {/* Barista tip */}
                  {item.step.tip && (
                    <View style={styles.baristaTip}>
                      <View style={styles.baristaTipHeader}>
                        <Text style={styles.baristaTipIcon}>☕</Text>
                        <Text style={styles.baristaTipLabel}>Tip od Baristu</Text>
                      </View>
                      <Text style={styles.baristaTipText}>{item.step.tip}</Text>
                    </View>
                  )}
                </ScrollView>
              </GlassCard>
            )}

            {/* Summary slide */}
            {item.type === 'summary' && (
              <GlassCard intensity="medium">
                <View style={styles.summaryContent}>
                  <View style={styles.summaryIconContainer}>
                    <LinearGradient
                      colors={['#8B6F47', '#B8956A']}
                      style={styles.summaryIconGradient}
                    >
                      <Text style={styles.summaryIcon}>🎉</Text>
                    </LinearGradient>
                  </View>

                  <Text style={styles.summaryTitle}>{item.title}</Text>
                  <Text style={styles.summaryDescription}>{item.description}</Text>

                  <View style={styles.summaryCards}>
                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryCardIcon}>⭐</Text>
                      <Text style={styles.summaryCardTitle}>Zhodnotenie</Text>
                      <Text style={styles.summaryCardText}>
                        Poznač si chuť, arómu a telo nápoja
                      </Text>
                    </View>

                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryCardIcon}>🔬</Text>
                      <Text style={styles.summaryCardTitle}>Experimentuj</Text>
                      <Text style={styles.summaryCardText}>
                        Skús zmeniť parametre a porovnaj výsledky
                      </Text>
                    </View>
                  </View>

                  <PremiumButton onPress={handleShare} variant="secondary">
                    Zdieľaj Recept
                  </PremiumButton>
                </View>
              </GlassCard>
            )}
          </Animated.View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={premiumCoffeeTheme.gradients.background}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Shimmer overlay */}
      <Animated.View
        style={[
          styles.shimmer,
          { opacity: shimmerOpacity },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Header */}
      <BlurView style={styles.header} blurType="light" blurAmount={20}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>BrewMate</Text>
          <View style={styles.headerDot} />
          <Text style={styles.headerDevice}>{brewDevice || 'Recipe'}</Text>
        </View>
      </BlurView>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <PremiumProgressBar
          currentStep={currentIndex}
          totalSteps={slides.length}
          stepLabels={slides.map((s) => s.title)}
        />
      </View>

      {/* Slides */}
      <AnimatedFlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={renderSlide}
        decelerationRate="fast"
      />

      {/* Navigation */}
      <BlurView style={styles.navigation} blurType="light" blurAmount={20}>
        <PremiumButton
          onPress={() => currentIndex > 0 && scrollToIndex(currentIndex - 1)}
          variant="ghost"
          disabled={currentIndex === 0}
          style={styles.navButton}
        >
          ← Predošlý
        </PremiumButton>

        <PremiumButton
          onPress={() => {
            if (isSummary) {
              handleComplete();
            } else {
              scrollToIndex(Math.min(slides.length - 1, currentIndex + 1));
            }
          }}
          variant="primary"
          style={styles.navButton}
        >
          {isSummary ? 'Hotovo ✓' : 'Ďalší →'}
        </PremiumButton>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 111, 71, 0.1)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: premiumCoffeeTheme.glass.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...premiumCoffeeTheme.shadows.small,
  },
  backButtonText: {
    fontSize: 22,
    color: premiumCoffeeTheme.text.primary,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: premiumCoffeeTheme.text.primary,
    letterSpacing: 0.5,
  },
  headerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: premiumCoffeeTheme.coffee.light,
  },
  headerDevice: {
    fontSize: 14,
    fontWeight: '500',
    color: premiumCoffeeTheme.text.light,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  slideWrapper: {
    flex: 1,
  },
  slidePadding: {
    padding: 20,
    flex: 1,
  },
  slideContainer: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: premiumCoffeeTheme.text.primary,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    fontSize: 16,
    color: premiumCoffeeTheme.text.light,
    marginBottom: 24,
    lineHeight: 24,
  },
  heroContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  heroIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 32,
    ...premiumCoffeeTheme.shadows.large,
  },
  heroIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
    fontSize: 64,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: premiumCoffeeTheme.text.primary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
  },
  heroDescription: {
    fontSize: 16,
    color: premiumCoffeeTheme.text.light,
    textAlign: 'center',
    lineHeight: 24,
  },
  decorativeDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: premiumCoffeeTheme.coffee.medium,
  },
  ingredientsGrid: {
    marginBottom: 20,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: premiumCoffeeTheme.accent.tertiary,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  tipIcon: {
    fontSize: 24,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: premiumCoffeeTheme.text.secondary,
    fontWeight: '500',
  },
  stepScrollContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginRight: 16,
    ...premiumCoffeeTheme.shadows.medium,
  },
  stepIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    fontSize: 32,
  },
  stepHeaderText: {
    flex: 1,
  },
  stepNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: premiumCoffeeTheme.text.primary,
    marginBottom: 4,
  },
  timeTag: {
    alignSelf: 'flex-start',
    backgroundColor: premiumCoffeeTheme.accent.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timeTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: premiumCoffeeTheme.text.secondary,
  },
  stepText: {
    fontSize: 18,
    lineHeight: 28,
    color: premiumCoffeeTheme.text.secondary,
    marginBottom: 24,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  baristaTip: {
    backgroundColor: premiumCoffeeTheme.accent.tertiary,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  baristaTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  baristaTipIcon: {
    fontSize: 20,
  },
  baristaTipLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: premiumCoffeeTheme.text.secondary,
  },
  baristaTipText: {
    fontSize: 15,
    lineHeight: 22,
    color: premiumCoffeeTheme.text.secondary,
  },
  summaryContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  summaryIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 24,
    ...premiumCoffeeTheme.shadows.large,
  },
  summaryIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIcon: {
    fontSize: 56,
  },
  summaryTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: premiumCoffeeTheme.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -1,
  },
  summaryDescription: {
    fontSize: 16,
    color: premiumCoffeeTheme.text.light,
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryCards: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  summaryCard: {
    backgroundColor: premiumCoffeeTheme.accent.tertiary,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  summaryCardIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: premiumCoffeeTheme.text.primary,
    marginBottom: 8,
  },
  summaryCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: premiumCoffeeTheme.text.secondary,
    textAlign: 'center',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 111, 71, 0.1)',
  },
  navButton: {
    flex: 1,
  },
});

export default PremiumRecipeStepsScreen;
