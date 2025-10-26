import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
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
import { useTheme } from '../../theme/ThemeProvider';
import { formatRecipeSteps, RecipeStep } from '../../components/utils/AITextFormatter';
import { BrewDevice } from '../../types/Recipe';
import { unifiedStyles } from '../../theme/unifiedStyles';
import { incrementProgress } from '../../services/profileServices';
import { materialYouCoffee } from '../../theme/materialYouColors';
import type { ViewToken, FlatListProps } from 'react-native';

// Import new components
import IngredientChip from '../../components/recipes/IngredientChip';
import LiquidAnimation from '../../components/recipes/LiquidAnimation';
import BaristaTooltip from '../../components/recipes/BaristaTooltip';
import ProgressTimeline from '../../components/recipes/ProgressTimeline';
import SteamAnimation from '../../components/recipes/SteamAnimation';
import CircularTimer from '../../components/recipes/CircularTimer';

export interface RecipeStepsScreenProps {
  recipe: string;
  brewDevice?: BrewDevice;
  onBack: () => void;
}

type SlideType =
  | 'hero'
  | 'ingredients'
  | 'equipment'
  | 'grind'
  | 'heat'
  | 'bloom'
  | 'pour1'
  | 'pour2'
  | 'finish'
  | 'summary';

type SlideData = {
  type: SlideType;
  id: string;
  step?: RecipeStep;
  title: string;
  description?: string;
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as React.ComponentType<
  FlatListProps<SlideData>
>;

const RecipeStepsScreenMD3: React.FC<RecipeStepsScreenProps> = ({
  recipe,
  brewDevice,
  onBack,
}) => {
  const { colors: themeColors } = useTheme();
  const { typography } = unifiedStyles;
  const steps = useMemo(() => formatRecipeSteps(recipe).slice(0, 10), [recipe]);

  // Create storytelling slides from steps
  const slides = useMemo(() => {
    const allSlides: SlideData[] = [
      {
        type: 'hero',
        id: 'hero',
        title: 'Tvoj kávový príbeh začína',
        description: 'Priprav sa na dokonalý šálku kávy',
      },
    ];

    // Map steps to slide types based on content
    steps.forEach((step, index) => {
      const stepText = step.text.toLowerCase();
      let slideType: SlideType = 'pour1';

      if (stepText.includes('ingredien') || stepText.includes('potrebuj')) {
        slideType = 'ingredients';
      } else if (stepText.includes('náčin') || stepText.includes('pripr')) {
        slideType = 'equipment';
      } else if (stepText.includes('zomeľ') || stepText.includes('mlieť')) {
        slideType = 'grind';
      } else if (stepText.includes('voda') || stepText.includes('zohrej')) {
        slideType = 'heat';
      } else if (stepText.includes('bloom') || stepText.includes('kvit')) {
        slideType = 'bloom';
      } else if (index === steps.length - 1) {
        slideType = 'finish';
      } else if (stepText.includes('nalej') || stepText.includes('prelej')) {
        slideType = index % 2 === 0 ? 'pour1' : 'pour2';
      }

      allSlides.push({
        type: slideType,
        id: `step-${index}`,
        step,
        title: step.text,
        description: `Krok ${step.number}`,
      });
    });

    allSlides.push({
      type: 'summary',
      id: 'summary',
      title: 'Čas na ochutnávku!',
      description: 'Tvoja káva je pripravená',
    });

    return allSlides.slice(0, 10); // Max 10 slides
  }, [steps]);

  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<SlideData> | null>(null);

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

  // Timeline steps for progress
  const timelineSteps = slides.map((slide) => ({
    icon: slide.step?.icon || '☕',
    label: slide.type === 'hero' ? 'Úvod' : slide.type === 'summary' ? 'Hotovo' : `Krok ${currentIndex}`,
  }));

  const progress = (currentIndex + 1) / slides.length;
  const isSummary = currentIndex === slides.length - 1;

  const renderSlide = ({ item, index }: { item: SlideData; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const cardScale = scrollX.interpolate({
      inputRange,
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });
    const cardOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slideWrapper, { width }]}>
        <View style={styles.slidePadding}>
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ scale: cardScale }],
                opacity: cardOpacity,
              },
            ]}
          >
            <LinearGradient
              colors={materialYouCoffee.gradients.card}
              style={styles.cardGradient}
            />

            {/* Hero slide */}
            {item.type === 'hero' && (
              <View style={styles.heroContent}>
                <Text style={styles.heroIcon}>☕</Text>
                <Text style={styles.heroTitle}>{item.title}</Text>
                <Text style={styles.heroDescription}>{item.description}</Text>
                <SteamAnimation />
              </View>
            )}

            {/* Ingredients slide */}
            {item.type === 'ingredients' && (
              <ScrollView style={styles.scrollContent}>
                <Text style={styles.slideTitle}>Čo budeš potrebovať</Text>
                <View style={styles.ingredientsGrid}>
                  <IngredientChip
                    icon="☕"
                    name="Káva"
                    amount="18g"
                    tip="Použi stredne praženú kávu pre vyváženú chuť"
                    index={0}
                  />
                  <IngredientChip
                    icon="💧"
                    name="Voda"
                    amount="300ml"
                    tip="Filtrovaná voda pri 93°C pre najlepšie výsledky"
                    index={1}
                  />
                  <IngredientChip
                    icon="📄"
                    name="Filter"
                    amount="1x"
                    tip="Opláchnuť teplou vodou pred použitím"
                    index={2}
                  />
                </View>
                <BaristaTooltip tip="Pomer 1:16 (káva:voda) je skvelý štartovací bod" />
              </ScrollView>
            )}

            {/* Equipment slide */}
            {item.type === 'equipment' && (
              <View style={styles.equipmentContent}>
                <Text style={styles.slideTitle}>Priprav si náčinie</Text>
                <Text style={styles.slideDescription}>{item.step?.text}</Text>
                <View style={styles.checklistContainer}>
                  <ChecklistItem icon="⚖️" label="Digitálna váha" />
                  <ChecklistItem icon="☕" label={`${brewDevice || 'V60'} dripper`} />
                  <ChecklistItem icon="🫖" label="Kanvica na vodu" />
                  <ChecklistItem icon="🥤" label="Server alebo hrnček" />
                </View>
                <BaristaTooltip tip="Príprava náčinia vopred ušetrí čas a zlepší výsledok" />
              </View>
            )}

            {/* Grind slide */}
            {item.type === 'grind' && (
              <View style={styles.grindContent}>
                <Text style={styles.slideIcon}>⚙️</Text>
                <Text style={styles.slideTitle}>Zmletie kávy</Text>
                <Text style={styles.slideDescription}>{item.step?.text}</Text>
                <View style={styles.grindVisualization}>
                  <View style={styles.grindScale}>
                    <View style={[styles.grindMarker, styles.grindMarkerActive]} />
                    <Text style={styles.grindLabel}>Jemné</Text>
                  </View>
                  <View style={styles.grindScale}>
                    <View style={[styles.grindMarker, styles.grindMarkerActive]} />
                    <Text style={[styles.grindLabel, styles.grindLabelActive]}>Stredné</Text>
                  </View>
                  <View style={styles.grindScale}>
                    <View style={styles.grindMarker} />
                    <Text style={styles.grindLabel}>Hrubé</Text>
                  </View>
                </View>
                <BaristaTooltip tip="Stredné mletie = konzistencia morskej soli" />
              </View>
            )}

            {/* Heat slide */}
            {item.type === 'heat' && (
              <View style={styles.heatContent}>
                <Text style={styles.slideIcon}>🌡️</Text>
                <Text style={styles.slideTitle}>Zahrievanie vody</Text>
                <Text style={styles.slideDescription}>{item.step?.text}</Text>
                <View style={styles.temperatureContainer}>
                  <View style={styles.thermometer}>
                    <LinearGradient
                      colors={['#4A90E2', '#FF6B6B']}
                      style={styles.thermometerFill}
                    />
                    <Text style={styles.temperatureText}>93°C</Text>
                  </View>
                </View>
                {item.step?.time && <CircularTimer seconds={item.step.time} autoStart={false} />}
                <BaristaTooltip tip="Ideálna teplota pre svetlé praženie: 92-94°C" />
              </View>
            )}

            {/* Bloom slide */}
            {item.type === 'bloom' && (
              <View style={styles.bloomContent}>
                <Text style={styles.slideTitle}>Blooming - Kvitnutie</Text>
                <Text style={styles.slideDescription}>{item.step?.text}</Text>
                <LiquidAnimation type="pour" duration={3} />
                {item.step?.time && <CircularTimer seconds={item.step.time} autoStart={false} />}
                <BaristaTooltip tip="Nalej 40ml vody v kruhu, nechaj 30s vypúšťať CO2" />
              </View>
            )}

            {/* Pour slides */}
            {(item.type === 'pour1' || item.type === 'pour2') && (
              <View style={styles.pourContent}>
                <Text style={styles.slideTitle}>{item.step?.text || 'Lievanie'}</Text>
                <Text style={styles.slideDescription}>
                  {item.type === 'pour1'
                    ? 'Lej pomaly v špirále od stredu k okrajom'
                    : 'Drž stabilnú rýchlosť - cca 10ml/s'}
                </Text>
                <LiquidAnimation type="fill" duration={item.step?.time || 45} />
                {item.step?.time && <CircularTimer seconds={item.step.time} autoStart={false} />}
                <BaristaTooltip
                  tip={
                    item.type === 'pour1'
                      ? 'Špirálový pohyb zabezpečí rovnomernú extrakciu'
                      : 'Sleduj farbu a rytmus extrakcie'
                  }
                />
              </View>
            )}

            {/* Finish slide */}
            {item.type === 'finish' && (
              <View style={styles.finishContent}>
                <Text style={styles.slideIcon}>⏱️</Text>
                <Text style={styles.slideTitle}>Finálna extrakcia</Text>
                <Text style={styles.slideDescription}>{item.step?.text}</Text>
                <LiquidAnimation type="drip" duration={5} />
                {item.step?.time && <CircularTimer seconds={item.step.time} autoStart={false} />}
                <BaristaTooltip tip="Celkový čas by mal byť 2:30 - 3:00 min" />
              </View>
            )}

            {/* Summary slide */}
            {item.type === 'summary' && (
              <View style={styles.summaryContent}>
                <Text style={styles.summaryIcon}>🎉</Text>
                <Text style={styles.summaryTitle}>{item.title}</Text>
                <Text style={styles.summaryDescription}>{item.description}</Text>

                <View style={styles.summaryGrid}>
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardIcon}>⭐</Text>
                    <Text style={styles.summaryCardTitle}>Zhodnotenie</Text>
                    <Text style={styles.summaryCardText}>
                      Zapíš si dojmy z arómy, tela nápoja a sladkosti
                    </Text>
                  </View>

                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryCardIcon}>🔬</Text>
                    <Text style={styles.summaryCardTitle}>Experimentuj</Text>
                    <Text style={styles.summaryCardText}>
                      Skús upraviť pomer vody a kávy alebo čas lúhovania
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <Text style={styles.shareButtonText}>Zdieľaj recept</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={materialYouCoffee.gradients.hero}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerLabel}>BrewMate</Text>
          <Text style={styles.stepCounter}>
            {isSummary ? 'Zhrnutie' : `${currentIndex + 1}/${slides.length}`}
          </Text>
        </View>
      </View>

      {/* Progress Timeline */}
      <View style={styles.progressContainer}>
        <ProgressTimeline
          currentStep={currentIndex}
          totalSteps={slides.length}
          steps={timelineSteps}
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
      />

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={() => currentIndex > 0 && scrollToIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <Text style={styles.navButtonText}>← Predošlý</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonPrimary, isSummary && styles.navButtonComplete]}
          onPress={() => {
            if (isSummary) {
              handleComplete();
            } else {
              scrollToIndex(Math.min(slides.length - 1, currentIndex + 1));
            }
          }}
        >
          <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
            {isSummary ? '✓ Hotovo' : 'Ďalší →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Checklist item component
const ChecklistItem: React.FC<{ icon: string; label: string }> = ({ icon, label }) => {
  const [checked, setChecked] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
    setChecked(!checked);
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.checklistItem}>
      <Animated.View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </Animated.View>
      <Text style={styles.checklistIcon}>{icon}</Text>
      <Text style={styles.checklistLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: materialYouCoffee.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: materialYouCoffee.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButtonText: {
    fontSize: 24,
    color: materialYouCoffee.onSurface,
  },
  headerInfo: {
    alignItems: 'flex-end',
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: materialYouCoffee.onSurfaceVariant,
  },
  stepCounter: {
    fontSize: 18,
    fontWeight: '700',
    color: materialYouCoffee.onSurface,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  slideWrapper: {
    flex: 1,
  },
  slidePadding: {
    padding: 16,
    flex: 1,
  },
  card: {
    flex: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: materialYouCoffee.surface,
    shadowColor: materialYouCoffee.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flex: 1,
    padding: 24,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: materialYouCoffee.onSurface,
    marginBottom: 12,
  },
  slideDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: materialYouCoffee.onSurfaceVariant,
    marginBottom: 20,
  },
  slideIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  heroIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: materialYouCoffee.onSurface,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 18,
    color: materialYouCoffee.onSurfaceVariant,
    textAlign: 'center',
  },
  ingredientsGrid: {
    marginBottom: 20,
  },
  equipmentContent: {
    flex: 1,
    padding: 24,
  },
  checklistContainer: {
    marginVertical: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: materialYouCoffee.surfaceVariant,
    borderRadius: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: materialYouCoffee.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: materialYouCoffee.primary,
    borderColor: materialYouCoffee.primary,
  },
  checkmark: {
    color: materialYouCoffee.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  checklistIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  checklistLabel: {
    fontSize: 16,
    color: materialYouCoffee.onSurface,
    flex: 1,
  },
  grindContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  grindVisualization: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 32,
  },
  grindScale: {
    alignItems: 'center',
  },
  grindMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: materialYouCoffee.surfaceVariant,
    borderWidth: 2,
    borderColor: materialYouCoffee.outline,
    marginBottom: 8,
  },
  grindMarkerActive: {
    backgroundColor: materialYouCoffee.primary,
    borderColor: materialYouCoffee.primary,
  },
  grindLabel: {
    fontSize: 14,
    color: materialYouCoffee.onSurfaceVariant,
  },
  grindLabelActive: {
    fontWeight: '700',
    color: materialYouCoffee.onSurface,
  },
  heatContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  temperatureContainer: {
    marginVertical: 32,
  },
  thermometer: {
    width: 120,
    height: 200,
    backgroundColor: materialYouCoffee.surfaceVariant,
    borderRadius: 60,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: materialYouCoffee.outline,
  },
  thermometerFill: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  temperatureText: {
    fontSize: 28,
    fontWeight: '700',
    color: materialYouCoffee.onSurface,
  },
  bloomContent: {
    flex: 1,
    padding: 24,
  },
  pourContent: {
    flex: 1,
    padding: 24,
  },
  finishContent: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  summaryIcon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: materialYouCoffee.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 16,
    color: materialYouCoffee.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryGrid: {
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: materialYouCoffee.primaryContainer,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  summaryCardIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: materialYouCoffee.onPrimaryContainer,
    marginBottom: 8,
  },
  summaryCardText: {
    fontSize: 14,
    lineHeight: 20,
    color: materialYouCoffee.onPrimaryContainer,
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: materialYouCoffee.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: materialYouCoffee.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: materialYouCoffee.onPrimary,
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: materialYouCoffee.surfaceVariant,
    borderWidth: 1,
    borderColor: materialYouCoffee.outline,
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: materialYouCoffee.primary,
    borderColor: materialYouCoffee.primary,
  },
  navButtonComplete: {
    backgroundColor: materialYouCoffee.success,
    borderColor: materialYouCoffee.success,
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: materialYouCoffee.onSurfaceVariant,
  },
  navButtonTextPrimary: {
    color: materialYouCoffee.onPrimary,
  },
});

export default RecipeStepsScreenMD3;
