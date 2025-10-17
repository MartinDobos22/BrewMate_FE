import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearScheduledDailyTipRefresh,
  fetchDailyTip,
  getScheduledDailyTipRefreshHandle,
  getTipFromCache,
  scheduleDailyTipRefresh,
} from '../services';
import type { Tip } from '../services';

interface Props {
  tip?: Tip;
}

const SAVED_TIPS_KEY = 'SavedTips';

const DailyTipCard: React.FC<Props> = ({ tip }) => {
  const [currentTip, setCurrentTip] = useState<Tip | null>(tip ?? null);

  useEffect(() => {
    let mounted = true;
    const queueNextRefresh = () => {
      if (!mounted) {
        return;
      }

      if (getScheduledDailyTipRefreshHandle()) {
        return;
      }

      scheduleDailyTipRefresh(async () => {
        const nextTip = await fetchDailyTip();
        if (!mounted) {
          return;
        }

        setCurrentTip(nextTip);
        queueNextRefresh();
      });
    };
    if (tip) {
      setCurrentTip(tip);
    } else {
      const loadTip = async () => {
        const today = new Date().toISOString().slice(0, 10);
        const cached = await getTipFromCache(today);
        if (mounted && cached) {
          setCurrentTip(cached);
          return;
        }

        const fetched = await fetchDailyTip();
        if (mounted) {
          setCurrentTip(fetched);
          queueNextRefresh();
        }
      };

      loadTip().catch((error) => {
        console.warn('DailyTipCard: failed to load tip', error);
      });
    }

    return () => {
      mounted = false;
      clearScheduledDailyTipRefresh();
    };
  }, [tip]);

  const saveTip = async () => {
    if (!currentTip) return;
    const raw = await AsyncStorage.getItem(SAVED_TIPS_KEY);
    const arr: Tip[] = raw ? JSON.parse(raw) : [];
    if (!arr.find((t) => t.id === currentTip.id && t.date === currentTip.date)) {
      arr.push(currentTip);
      await AsyncStorage.setItem(SAVED_TIPS_KEY, JSON.stringify(arr));
    }
  };

  const shareTip = () => {
    if (!currentTip) return;
    Share.share({ message: currentTip.text });
  };

  if (!currentTip) return null;

  const formattedDate = currentTip.date
    ? new Date(currentTip.date).toLocaleDateString('sk-SK', {
        day: '2-digit',
        month: 'long',
      })
    : null;

  return (
    <LinearGradient
      colors={['#D4A574', '#C8A882']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>💡</Text>
        </View>
        <View>
          <Text style={styles.label}>Tip dňa</Text>
          {formattedDate ? <Text style={styles.date}>{formattedDate}</Text> : null}
        </View>
      </View>
      <Text style={styles.text}>{currentTip.text}</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={saveTip} style={styles.actionPrimary}>
          <Text style={styles.actionPrimaryText}>Ulož</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={shareTip} style={styles.actionSecondary}>
          <Text style={styles.actionSecondaryText}>Zdieľaj</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E2617',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  date: {
    fontSize: 11,
    color: 'rgba(62,38,23,0.8)',
    marginTop: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPrimary: {
    flex: 1,
    backgroundColor: '#6B4423',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 12,
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  actionSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  actionSecondaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});

export default DailyTipCard;
