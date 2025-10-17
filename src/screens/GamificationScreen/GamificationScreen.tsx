import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, Modal, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { badges, Badge } from '../../data/badges';
import { getUserProgress, UserProgress } from './services';
import { styles } from './styles';

const GamificationScreen: React.FC = () => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      const p = await getUserProgress();
      setProgress(p);
      if (p.lastBadge) {
        const badge = badges.find((b) => b.id === p.lastBadge) || null;
        setNewBadge(badge);
        setModalVisible(true);
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
        p.lastBadge = undefined;
        await AsyncStorage.setItem('userProgress', JSON.stringify(p));
      }
    };
    load();
  }, [scaleAnim]);

  const unlocked = progress?.badges || [];

  const renderBadge = ({ item }: { item: Badge }) => {
    const isUnlocked = unlocked.includes(item.id);
    return (
      <View style={[styles.badge, { opacity: isUnlocked ? 1 : 0.3 }]}>
        <Text style={styles.badgeIcon}>{item.icon}</Text>
        <Text style={styles.badgeText}>{item.title}</Text>
      </View>
    );
  };

  const levelPercent = progress ? ((progress.level - 1) / 9) * 100 : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.levelText}>Úroveň {progress?.level || 1}/10</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${levelPercent}%` }]} />
      </View>

      <FlatList
        data={badges}
        renderItem={renderBadge}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.badgeGrid}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}> 
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalText}>Gratulujeme!</Text>
            {newBadge && <Text style={styles.modalBadgeTitle}>{newBadge.title}</Text>}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default GamificationScreen;
