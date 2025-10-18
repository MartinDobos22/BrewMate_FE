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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { formatRecipeSteps, RecipeStep } from '../../components/utils/AITextFormatter';
import { BrewDevice } from '../../types/Recipe';
import Timer from '../../components/recipes/Timer';
import { unifiedStyles } from '../../theme/unifiedStyles';
import { incrementProgress } from '../../services/profileServices';
import type { ViewToken, FlatListProps } from 'react-native';

export interface RecipeStepsScreenProps {
  recipe: string;
  brewDevice?: BrewDevice;
  onBack: () => void;
}

type SlideData =
  | {
      type: 'step';
      id: string;
      step: RecipeStep;
    }
  | {
      type: 'summary';
      id: 'summary';
    };

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as React.ComponentType<
  FlatListProps<SlideData>
>;

const RecipeStepsScreen: React.FC<RecipeStepsScreenProps> = ({ recipe, brewDevice, onBack }) => {
  const { colors: themeColors } = useTheme();
  const { typography } = unifiedStyles;
  const steps = useMemo(() => formatRecipeSteps(recipe).slice(0, 10), [recipe]);
  const slides = useMemo(() => {
    if (steps.length === 0) {
      return [] as SlideData[];
    }

    const mappedSteps: SlideData[] = steps.map((step, index) => ({
      type: 'step',
      id: `step-${index}`,
      step,
    }));

    mappedSteps.push({ type: 'summary', id: 'summary' });

    return mappedSteps;
  }, [steps]);

  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<SlideData> | null>(null);
  const steamAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(steamAnim, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(steamAnim, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [steamAnim]);

  const handleShare = useCallback(async () => {
    if (steps.length === 0) {
      return;
    }

    const shareMessage = steps.map((step) => `${step.number}. ${step.text}`).join('\n');

    try {
      await Share.share({
        title: 'BrewMate recept',
        message: shareMessage,
        url: Platform.select({ ios: undefined, android: undefined }),
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
    },
  ).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 60 }).current;

  if (slides.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: themeColors.background }]}> 
        <Text style={styles.emptyStateTitle}>Žiadne kroky na zobrazenie</Text>
        <Text style={styles.emptyStateSubtitle}>
          Skús opäť vygenerovať recept alebo sa vráť späť.
        </Text>
        <TouchableOpacity onPress={onBack} style={styles.backChip}>
          <Text style={styles.backChipText}>← Späť</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const palette = {
    espresso: '#3C1F1A',
    cappuccino: '#A07455',
    latte: '#E8D3B0',
    foam: 'rgba(255,255,255,0.22)',
    accent: '#FFC58B',
    accentSecondary: '#FF8F6B',
  } as const;

  const progress = (currentIndex + 1) / slides.length;
  const isSummary = currentIndex === slides.length - 1;

  const scrollToIndex = (index: number) => {
    flatListRef.current?.scrollToOffset({ offset: index * width, animated: true });
  };

  return (
    <View style={styles.container}> 
      <LinearGradient
        colors={[palette.espresso, palette.cappuccino, palette.latte]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.steam,
          {
            opacity: steamAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }),
            transform: [
              {
                translateY: steamAnim.interpolate({ inputRange: [0, 1], outputRange: [12, -12] }),
              },
            ],
          },
        ]}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Späť</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerLabel}>BrewMate Recept</Text>
          <Text style={styles.stepCounter}>
            {isSummary ? 'Zhrnutie & tipy' : `Krok ${currentIndex + 1} z ${slides.length}`}
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressHighlight, { width: `${Math.min(progress, 1) * 100}%` }]}
          />
          {slides.map((slide, index) => {
            const left = slides.length === 1 ? '0%' : `${(index / (slides.length - 1)) * 100}%`;
            return (
              <View key={slide.id} style={[styles.progressNodeWrapper, { left }]}> 
                <View
                  style={[
                    styles.progressNode,
                    index <= currentIndex && styles.progressNodeActive,
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

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
        renderItem={({ item, index }) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          const cardScale = scrollX.interpolate({
            inputRange,
            outputRange: [0.92, 1, 0.92],
            extrapolate: 'clamp',
          });
          const cardOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.45, 1, 0.45],
            extrapolate: 'clamp',
          });

          return (
            <View style={[styles.slideWrapper, { width }]}> 
              <View style={styles.slidePadding}>
                <Animated.View
                  style={[
                    styles.stepCard,
                    {
                      transform: [{ scale: cardScale }],
                      opacity: cardOpacity,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[palette.foam, 'rgba(255,255,255,0.08)']}
                    style={styles.cardOverlay}
                  />
                  {item.type === 'step' && (
                    <>
                      <View style={styles.cardTopRow}>
                        <View style={styles.stepBadge}>
                          <Text style={styles.stepBadgeText}>{item.step.icon || '☕️'}</Text>
                        </View>
                        <View style={styles.timePill}>
                          <Text style={styles.timePillLabel}>Krok {item.step.number}</Text>
                          {item.step.time ? (
                            <Text style={styles.timePillValue}>{item.step.time}s</Text>
                          ) : (
                            <Text style={styles.timePillValue}>Bez časovača</Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <Text style={[typography.h3, styles.cardTitle]}>Postup</Text>
                        <Text style={styles.cardDescription}>{item.step.text}</Text>
                      </View>

                      {item.step.time && (
                        <View style={styles.timerWrapper}>
                          <Timer seconds={item.step.time} />
                        </View>
                      )}

                      <View style={styles.cardFooter}>
                        <Text style={styles.cardFooterLabel}>Tip baristu</Text>
                        <Text style={styles.cardFooterText}>
                          Sleduj farbu a rytmus extrakcie – jemné miešanie zabezpečí vyrovnané chute.
                        </Text>
                      </View>
                    </>
                  )}

                  {item.type === 'summary' && (
                    <View style={styles.summaryContent}>
                      <Text style={[typography.h2, styles.summaryTitle]}>Čas na ochutnávku!</Text>
                      <Text style={styles.summarySubtitle}>
                        Zdieľaj recept s priateľmi, ulož si poznámky a objav nové kombinácie chutí.
                      </Text>
                      <View style={styles.summaryGrid}>
                        <View style={styles.summaryCard}>
                          <Text style={styles.summaryCardTitle}>Zhodnotenie</Text>
                          <Text style={styles.summaryCardText}>
                            Zapíš si dojmy z arómy, tela nápoja a sladkosti pre budúce experimenty.
                          </Text>
                        </View>
                        <View style={styles.summaryCard}>
                          <Text style={styles.summaryCardTitle}>Experimentuj</Text>
                          <Text style={styles.summaryCardText}>
                            Skús upraviť pomer vody a kávy alebo čas lúhovania a sleduj rozdiely.
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.shareButton, { backgroundColor: palette.accentSecondary }]}
                        onPress={handleShare}
                      >
                        <Text style={styles.shareButtonText}>Zdieľaj recept</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentIndex === 0 && styles.navButtonDisabled,
          ]}
          onPress={() => currentIndex > 0 && scrollToIndex(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <Text style={styles.navButtonText}>← Predošlý</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonPrimary,
            isSummary && styles.navButtonComplete,
          ]}
          onPress={() => {
            if (isSummary) {
              handleComplete();
            } else {
              scrollToIndex(Math.min(slides.length - 1, currentIndex + 1));
            }
          }}
        >
          <Text style={styles.navButtonText}>{isSummary ? '✓ Hotovo' : 'Ďalší →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3C1F1A',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerInfo: {
    alignItems: 'flex-end',
  },
  headerLabel: {
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FCE7D7',
    fontWeight: '600',
  },
  stepCounter: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    position: 'relative',
    overflow: 'visible',
  },
  progressHighlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#FFC58B',
  },
  progressNodeWrapper: {
    position: 'absolute',
    top: -6,
    width: 0,
    alignItems: 'center',
    marginLeft: -6,
  },
  progressNode: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  progressNodeActive: {
    backgroundColor: '#FF8F6B',
    borderColor: '#FF8F6B',
  },
  slideWrapper: {
    flex: 1,
  },
  slidePadding: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  stepCard: {
    flex: 1,
    minHeight: 460,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    padding: 24,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  stepBadgeText: {
    fontSize: 36,
  },
  timePill: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  timePillLabel: {
    color: '#FFE9D2',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  timePillValue: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  cardContent: {
    flex: 1,
    marginTop: 28,
  },
  cardTitle: {
    color: '#FFFFFF',
    marginBottom: 12,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    lineHeight: 24,
  },
  timerWrapper: {
    marginTop: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  cardFooter: {
    marginTop: 28,
    padding: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardFooterLabel: {
    color: '#FFE9D2',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardFooterText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  summaryTitle: {
    color: '#FFFFFF',
    marginBottom: 12,
  },
  summarySubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    lineHeight: 24,
  },
  summaryGrid: {
    marginTop: 24,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  summaryCardTitle: {
    color: '#FFE9D2',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryCardText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
  },
  shareButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#3C1F1A',
    fontSize: 16,
    fontWeight: '700',
  },
  navigation: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 8,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
  },
  navButtonPrimary: {
    backgroundColor: '#FFC58B',
    borderColor: '#FFC58B',
  },
  navButtonComplete: {
    backgroundColor: '#8BC34A',
    borderColor: '#8BC34A',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C130C',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: '#3C1F1A',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B4423',
    marginBottom: 20,
  },
  backChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFC58B',
  },
  backChipText: {
    color: '#3C1F1A',
    fontWeight: '700',
  },
  steam: {
    position: 'absolute',
    top: 120,
    right: 48,
    width: 120,
    height: 220,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});

export default RecipeStepsScreen;
