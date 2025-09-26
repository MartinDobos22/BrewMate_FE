import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TasteQuizResult } from '../../types/PersonalizationAI';
import { FlavorJourneyMilestone } from '../../types/PersonalizationAI';
import { UserTasteProfile } from '../../types/Personalization';
import { usePersonalization } from '../../hooks/usePersonalization';

interface PersonalizationDashboardProps {
  quizResult?: TasteQuizResult;
  confidence?: Array<{ label: string; value: number }>;
  timeline?: Array<{ date: string; description: string }>;
  onToggleExperiment: (enabled: boolean) => void;
  experimentsEnabled: boolean;
  journey?: FlavorJourneyMilestone[];
  profile?: UserTasteProfile | null;
}

export const PersonalizationDashboard: React.FC<PersonalizationDashboardProps> = ({
  quizResult,
  confidence,
  timeline,
  onToggleExperiment,
  experimentsEnabled,
  journey,
  profile,
}) => {
  const { insights, refreshInsights, ready } = usePersonalization();

  useEffect(() => {
    if (!refreshInsights || !ready) {
      return;
    }

    refreshInsights().catch((error) => {
      console.warn('PersonalizationDashboard: failed to refresh smart diary insights', error);
    });
  }, [ready, refreshInsights]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Personalizačné učenie</Text>
      <Text style={styles.subtitle}>Systém sa prispôsobuje každej interakcii.</Text>

      {profile ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tvoj chuťový profil</Text>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Sladkosť</Text>
            <Text style={styles.profileValue}>{profile.preferences.sweetness.toFixed(1)}/10</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Kyslosť</Text>
            <Text style={styles.profileValue}>{profile.preferences.acidity.toFixed(1)}/10</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Horkosť</Text>
            <Text style={styles.profileValue}>{profile.preferences.bitterness.toFixed(1)}/10</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Telo</Text>
            <Text style={styles.profileValue}>{profile.preferences.body.toFixed(1)}/10</Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileMetaText}>Preferovaná sila: {profile.preferredStrength}</Text>
            <Text style={styles.profileMetaText}>Citlivosť na kofeín: {profile.caffeineSensitivity}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Miera istoty</Text>
        {confidence?.map((item) => (
          <View key={item.label} style={styles.confidenceRow}>
            <Text style={styles.confidenceLabel}>{item.label}</Text>
            <View style={styles.confidenceBarBackground}>
              <View style={[styles.confidenceBarFill, { width: `${item.value * 100}%` }]} />
            </View>
            <Text style={styles.confidenceValue}>{Math.round(item.value * 100)}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vývoj preferencií</Text>
        {timeline?.map((item) => (
          <View key={item.date} style={styles.timelineRow}>
            <Text style={styles.timelineDate}>{item.date}</Text>
            <Text style={styles.timelineDescription}>{item.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>A/B testovanie</Text>
        <Pressable
          style={[styles.toggleButton, experimentsEnabled ? styles.toggleButtonActive : undefined]}
          onPress={() => onToggleExperiment(!experimentsEnabled)}
        >
          <Text style={[styles.toggleText, experimentsEnabled ? styles.toggleTextActive : undefined]}>
            {experimentsEnabled ? 'Zapojený do experimentov' : 'Mimo experimentov'}
          </Text>
        </Pressable>
      </View>

      {journey && journey.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flavor journey</Text>
          {journey.map((milestone) => (
            <View key={milestone.id} style={styles.milestone}>
              <Text style={styles.milestoneTitle}>{milestone.title}</Text>
              <Text style={styles.milestoneDescription}>{milestone.description}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {insights && insights.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Denníkové náhľady</Text>
          {insights.map((insight) => (
            <View key={insight.id} style={styles.insightCard}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightBody}>{insight.body}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: '#666',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confidenceLabel: {
    width: 80,
    fontWeight: '600',
  },
  confidenceBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#EEE',
    borderRadius: 4,
    marginHorizontal: 12,
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#6F4E37',
    borderRadius: 4,
  },
  confidenceValue: {
    width: 48,
    textAlign: 'right',
    fontWeight: '600',
  },
  timelineRow: {
    marginBottom: 12,
  },
  timelineDate: {
    fontWeight: '600',
    color: '#6F4E37',
  },
  timelineDescription: {
    color: '#555',
    marginTop: 4,
  },
  toggleButton: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: '#EEE',
  },
  toggleButtonActive: {
    backgroundColor: '#6F4E37',
  },
  toggleText: {
    fontWeight: '700',
    color: '#444',
  },
  toggleTextActive: {
    color: '#fff',
  },
  milestone: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F5EFE9',
  },
  milestoneTitle: {
    fontWeight: '700',
  },
  milestoneDescription: {
    marginTop: 6,
    color: '#555',
  },
  insightCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  insightTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  insightBody: {
    color: '#555',
    lineHeight: 20,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileLabel: {
    fontWeight: '600',
    color: '#555',
  },
  profileValue: {
    fontVariant: ['tabular-nums'],
    color: '#2F2A1F',
  },
  profileMeta: {
    marginTop: 12,
    gap: 4,
  },
  profileMetaText: {
    color: '#555',
  },
});

export default PersonalizationDashboard;
