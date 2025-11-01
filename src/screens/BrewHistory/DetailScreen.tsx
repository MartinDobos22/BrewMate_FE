import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BrewLog } from '../../types/BrewLog';
import { detailStyles as styles } from './styles/detail';

interface BrewHistoryDetailScreenProps {
  log: BrewLog;
}

const formatDateTime = (iso: string): string => {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (error) {
    return iso;
  }
};

const BrewHistoryDetailScreen: React.FC<BrewHistoryDetailScreenProps> = ({ log }) => {
  const ratio = useMemo(() => {
    if (!log.coffeeDose || !log.waterVolume) {
      return null;
    }
    const value = log.waterVolume / log.coffeeDose;
    if (!Number.isFinite(value)) {
      return null;
    }
    return value.toFixed(1);
  }, [log.coffeeDose, log.waterVolume]);

  const timeline = useMemo(() => {
    const coffeeDoseText = log.coffeeDose ? `${log.coffeeDose} g` : 'tvoju dávku';
    const grindText = log.grindSize || 'zvolené mletie';
    const waterTempText = log.waterTemp ? `${log.waterTemp}°C` : 'požadovanú teplotu';
    const waterVolumeText = log.waterVolume ? `${log.waterVolume} ml vody` : 'potrebné množstvo vody';
    const ratioText = ratio ? `pomer ${ratio}:1` : 'pomer podľa preferencie';
    const brewTimeText = log.brewTime ? `drž extrakciu ${log.brewTime}` : 'sledovať extrakciu podľa chuti';

    return [
      {
        title: 'Predohrev & mletie',
        description: `Zohrej vodu na ${waterTempText} a namel ${coffeeDoseText} na ${grindText}.`,
      },
      {
        title: 'Extrakcia',
        description: `Nalej ${waterVolumeText} (${ratioText}) a ${brewTimeText}.`,
      },
      {
        title: 'Servírovanie',
        description: log.notes ? log.notes : 'Bez dodatočných poznámok – vychutnaj si nápoj.',
      },
    ];
  }, [log.brewTime, log.coffeeDose, log.grindSize, log.notes, log.waterTemp, log.waterVolume, ratio]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>
          {log.recipeId ? `Recept ${log.recipeId}` : 'Záznam prípravy'}
        </Text>
        <Text style={styles.heroSubtitle}>{log.brewDevice}</Text>
        <Text style={styles.heroMeta}>{formatDateTime(log.date)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parametre receptu</Text>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardSpacer]}>
            <Text style={styles.metricLabel}>Dávka kávy</Text>
            <Text style={styles.metricValue}>{log.coffeeDose ? `${log.coffeeDose} g` : 'Neuvedené'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Mletie</Text>
            <Text style={styles.metricValue}>{log.grindSize || 'Neuvedené'}</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardSpacer]}>
            <Text style={styles.metricLabel}>Objem vody</Text>
            <Text style={styles.metricValue}>{log.waterVolume ? `${log.waterVolume} ml` : 'Neuvedené'}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Teplota vody</Text>
            <Text style={styles.metricValue}>{log.waterTemp ? `${log.waterTemp} °C` : 'Neuvedené'}</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.metricCardSpacer]}>
            <Text style={styles.metricLabel}>Čas extrakcie</Text>
            <Text style={styles.metricValue}>{log.brewTime || 'Neuvedené'}</Text>
          </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Pomer</Text>
            <Text style={styles.metricValue}>{ratio ? `${ratio}:1` : 'Neuvedené'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kroky prípravy</Text>
        {timeline.map((step, index) => (
          <View key={step.title} style={styles.timelineItem}>
            <View style={styles.timelineBullet}>
              <Text style={styles.timelineIndex}>{index + 1}</Text>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>{step.title}</Text>
              <Text style={styles.timelineDescription}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chuťové poznámky</Text>
        <Text style={styles.notesText}>{log.notes || 'Neuvedené'}</Text>
      </View>
    </ScrollView>
  );
};

export default BrewHistoryDetailScreen;
