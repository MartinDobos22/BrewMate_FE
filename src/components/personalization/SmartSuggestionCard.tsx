import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PredictionResult } from '../../types/Personalization';
import { RecommendationExplanation } from '../../types/PersonalizationAI';

interface SmartSuggestionCardProps {
  prediction: PredictionResult;
  explanation?: RecommendationExplanation;
  onFeedback: (signal: 'like' | 'dislike' | 'save') => void;
}

export const SmartSuggestionCard: React.FC<SmartSuggestionCardProps> = ({ prediction, explanation, onFeedback }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>💡 {prediction.recipeId}</Text>
      <Text style={styles.subtitle}>Predikcia: {prediction.predictedRating.toFixed(1)} ★</Text>
      {explanation ? (
        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>Prečo práve táto káva</Text>
          <Text style={styles.explanationText}>{explanation.reason}</Text>
          {explanation.evidence.map((item) => (
            <Text key={item} style={styles.explanationEvidence}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => onFeedback('dislike')}>
          <Text style={styles.actionText}>Nie dnes</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => onFeedback('save')}>
          <Text style={styles.actionText}>Uložiť</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={() => onFeedback('like')}>
          <Text style={[styles.actionText, styles.primaryText]}>Pripraviť</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    color: '#555',
  },
  explanation: {
    marginTop: 16,
    backgroundColor: '#F4EEE8',
    borderRadius: 14,
    padding: 16,
  },
  explanationTitle: {
    fontWeight: '700',
  },
  explanationText: {
    marginTop: 4,
  },
  explanationEvidence: {
    marginTop: 4,
    color: '#6F4E37',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 999,
    marginHorizontal: 4,
    backgroundColor: '#EFEAE6',
  },
  actionText: {
    fontWeight: '600',
    color: '#6F4E37',
  },
  primaryButton: {
    backgroundColor: '#6F4E37',
  },
  primaryText: {
    color: '#fff',
  },
});

export default SmartSuggestionCard;
