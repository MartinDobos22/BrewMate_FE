import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlavorJourneyMilestone } from '../../types/PersonalizationAI';

interface FlavorJourneyMapProps {
  milestones: FlavorJourneyMilestone[];
  onShare?: () => void;
}

export const FlavorJourneyMap: React.FC<FlavorJourneyMapProps> = ({ milestones }) => {
  return (
    <ScrollView horizontal style={styles.container} showsHorizontalScrollIndicator={false}>
      {milestones.map((milestone, index) => (
        <View key={milestone.id} style={styles.milestoneCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{index + 1}</Text>
          </View>
          <Text style={styles.title}>{milestone.title}</Text>
          <Text style={styles.date}>{milestone.date}</Text>
          <Text style={styles.description}>{milestone.description}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    marginTop: 16,
  },
  milestoneCard: {
    width: 220,
    marginRight: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#1F1B2C',
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFBD59',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  badgeText: {
    fontWeight: '700',
    color: '#1F1B2C',
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  date: {
    color: '#C1BBD7',
    marginTop: 6,
    fontSize: 12,
  },
  description: {
    color: '#DED9F5',
    marginTop: 12,
    lineHeight: 18,
  },
});

export default FlavorJourneyMap;
