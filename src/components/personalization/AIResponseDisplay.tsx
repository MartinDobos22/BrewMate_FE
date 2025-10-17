// src/components/AIResponseDisplay.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  useColorScheme,
} from 'react-native';
import {
  parseAIResponse,
  formatCoffeeRecommendation,
  formatRecipeSteps,
  Section,
  Highlight,
  RecipeStep,
  FormattedRecommendation
} from '../utils/AITextFormatter.ts';

interface AIResponseDisplayProps {
  text: string;
  type?: 'recommendation' | 'recipe' | 'general';
  animate?: boolean;
}

/**
 * Hlavný komponent pre zobrazenie AI odpovedí
 */
export const AIResponseDisplay: React.FC<AIResponseDisplayProps> = ({
                                                                      text,
                                                                      type = 'general',
                                                                      animate = true
                                                                    }) => {
  const isDark = useColorScheme() === 'dark';
  const styles = createStyles(isDark);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animate) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [animate, fadeAnim, text]);

  if (type === 'recommendation') {
    const formatted = formatCoffeeRecommendation(text);
    return <RecommendationDisplay recommendation={formatted} fadeAnim={fadeAnim} />;
  }

  if (type === 'recipe') {
    const steps = formatRecipeSteps(text);
    return <RecipeDisplay steps={steps} fadeAnim={fadeAnim} />;
  }

  const parsed = parseAIResponse(text);
  return <GeneralDisplay content={parsed} fadeAnim={fadeAnim} />;
};

/**
 * Komponent pre zobrazenie odporúčaní kávy
 */
const RecommendationDisplay: React.FC<{
  recommendation: FormattedRecommendation;
  fadeAnim: Animated.Value;
}> = ({ recommendation, fadeAnim }) => {
  const isDark = useColorScheme() === 'dark';
  const styles = createStyles(isDark);

  const getSentimentColor = () => {
    switch (recommendation.sentiment) {
      case 'positive': return '#4CAF50';
      case 'negative': return '#FF6B6B';
      default: return '#FFA726';
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {recommendation.matchPercentage !== null && (
        <View
          style={[styles.matchBadge, { backgroundColor: getSentimentColor() }]}
        >
          <Text style={styles.matchText}>
            {recommendation.matchPercentage}% zhoda
          </Text>
        </View>
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{recommendation.summary}</Text>
      </View>

      {recommendation.sections.map(
        (section: any, index: React.Key | null | undefined) => (
          <SectionDisplay key={index} section={section} />
        ),
      )}
    </Animated.View>
  );
};

/**
 * Komponent pre zobrazenie receptu
 */
const RecipeDisplay: React.FC<{
  steps: RecipeStep[];
  fadeAnim: Animated.Value;
}> = ({ steps, fadeAnim }) => {
  const isDark = useColorScheme() === 'dark';
  const styles = createStyles(isDark);

  return (
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeAnim }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.recipeTitle}>📝 Postup prípravy</Text>

      {steps.map((step, index) => (
        <View key={index} style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.number}</Text>
            </View>
            <Text style={styles.stepIcon}>{step.icon}</Text>
          </View>

          <Text style={styles.stepText}>{step.text}</Text>

          {step.time && (
            <View style={styles.stepTime}>
              <Text style={styles.stepTimeIcon}>⏱️</Text>
              <Text style={styles.stepTimeText}>{Math.floor(step.time / 60)}:{(step.time % 60).toString().padStart(2, '0')}</Text>
            </View>
          )}
        </View>
      ))}
    </Animated.ScrollView>
  );
};

/**
 * Všeobecné zobrazenie pre iné typy odpovedí
 */
const GeneralDisplay: React.FC<{
  content: { sections: Section[] };
  fadeAnim: Animated.Value;
}> = ({ content, fadeAnim }) => {
  const isDark = useColorScheme() === 'dark';
  const styles = createStyles(isDark);

  return (
    <Animated.ScrollView
      style={[styles.container, { opacity: fadeAnim }]}
      showsVerticalScrollIndicator={false}
    >
      {content.sections.map((section, index) => (
        <SectionDisplay key={index} section={section} />
      ))}
    </Animated.ScrollView>
  );
};

/**
 * Komponent pre zobrazenie jednej sekcie
 */
const SectionDisplay: React.FC<{ section: Section }> = ({ section }) => {
  const isDark = useColorScheme() === 'dark';
  const styles = createStyles(isDark);

  return (
    <View style={styles.section}>
      {section.title && (
        <View style={styles.sectionHeader}>
          {section.emoji && (
            <Text style={styles.sectionEmoji}>{section.emoji}</Text>
          )}
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
      )}

      {section.content.map(
        (
          text:
            | string
            | number
            | bigint
            | boolean
            | React.ReactElement<
                unknown,
                string | React.JSXElementConstructor<any>
              >
            | Iterable<React.ReactNode>
            | React.ReactPortal
            | Promise<
                | string
                | number
                | bigint
                | boolean
                | React.ReactPortal
                | React.ReactElement<
                    unknown,
                    string | React.JSXElementConstructor<any>
                  >
                | Iterable<React.ReactNode>
                | null
                | undefined
              >
            | null
            | undefined,
          idx: React.Key | null | undefined,
        ) => (
          <Text key={idx} style={styles.contentText}>
            {text}
          </Text>
        ),
      )}

      {section.bullets.length > 0 && (
        <View style={styles.bulletList}>
          {section.bullets.map(
            (
              bullet:
                | string
                | number
                | bigint
                | boolean
                | React.ReactElement<
                    unknown,
                    string | React.JSXElementConstructor<any>
                  >
                | Iterable<React.ReactNode>
                | React.ReactPortal
                | Promise<
                    | string
                    | number
                    | bigint
                    | boolean
                    | React.ReactPortal
                    | React.ReactElement<
                        unknown,
                        string | React.JSXElementConstructor<any>
                      >
                    | Iterable<React.ReactNode>
                    | null
                    | undefined
                  >
                | null
                | undefined,
              idx: React.Key | null | undefined,
            ) => (
              <View key={idx} style={styles.bulletItem}>
                <Text style={styles.bulletIcon}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ),
          )}
        </View>
      )}

      {section.highlights && (
        <View style={styles.highlightContainer}>
          {section.highlights.map(
            (highlight: any, idx: React.Key | null | undefined) => (
              <HighlightDisplay key={idx} highlight={highlight} />
            ),
          )}
        </View>
      )}
    </View>
  );
};

/**
 * Komponent pre zvýraznené hodnoty
 */
const HighlightDisplay: React.FC<{ highlight: Highlight }> = ({ highlight }) => {
  const isDark = useColorScheme() === 'dark';
  const styles = createStyles(isDark);

  const getIcon = () => {
    switch (highlight.type) {
      case 'temperature': return '🌡️';
      case 'time': return '⏱️';
      case 'ratio': return '⚖️';
      case 'weight': return '⚖️';
      case 'volume': return '💧';
      default: return '📌';
    }
  };

  return (
    <View style={styles.highlightBadge}>
      <Text style={styles.highlightIcon}>{getIcon()}</Text>
      <View>
        {highlight.label && <Text style={styles.highlightLabel}>{highlight.label}</Text>}
        <Text style={styles.highlightValue}>{highlight.value}</Text>
      </View>
    </View>
  );
};

/**
 * Štýly pre komponenty
 */
const createStyles = (isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  // Match Badge
  matchBadge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
  },
  matchText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: isDark ? '#2A2A2A' : '#F8F4F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6B4423',
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: isDark ? '#E0E0E0' : '#2C2C2C',
    fontStyle: 'italic',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#2C2C2C',
    flex: 1,
  },

  // Content
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: isDark ? '#E0E0E0' : '#444444',
    marginBottom: 8,
  },

  // Bullets
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bulletIcon: {
    fontSize: 16,
    color: '#6B4423',
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: isDark ? '#E0E0E0' : '#444444',
  },

  // Highlights
  highlightContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? '#3A3A3A' : '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: isDark ? '#555' : '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  highlightIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  highlightLabel: {
    fontSize: 10,
    color: isDark ? '#999' : '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  highlightValue: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#FFFFFF' : '#2C2C2C',
  },

  // Recipe specific
  recipeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#FFFFFF' : '#2C2C2C',
    marginBottom: 20,
  },
  stepCard: {
    backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6B4423',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B4423',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  stepIcon: {
    fontSize: 24,
  },
  stepText: {
    fontSize: 15,
    lineHeight: 22,
    color: isDark ? '#E0E0E0' : '#444444',
  },
  stepTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? '#444' : '#E0E0E0',
  },
  stepTimeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  stepTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B4423',
  },
});

export default AIResponseDisplay;