import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Modal, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { badges, Badge } from '../data/badges';
import { getUserProgress, UserProgress } from '../services/profileServices';

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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  levelText: { fontSize: 18, marginBottom: 10, textAlign: 'center' },
  progressBar: { height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden', marginBottom: 20 },
  progressFill: { height: '100%', backgroundColor: '#6B4423' },
  badgeGrid: { alignItems: 'center' },
  badge: { width: '30%', margin: '1.5%', alignItems: 'center' },
  badgeIcon: { fontSize: 32 },
  badgeText: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  modalBackdrop: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalContent: { backgroundColor:'#fff', padding:30, borderRadius:10, alignItems:'center' },
  modalEmoji: { fontSize:48, marginBottom:10 },
  modalText: { fontSize:20, fontWeight:'bold', marginBottom:10 },
  modalBadgeTitle: { fontSize:16 },
});

export default GamificationScreen;
