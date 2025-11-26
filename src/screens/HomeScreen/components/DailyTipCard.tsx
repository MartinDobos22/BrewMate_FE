import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  insight?: string;
  advice?: string;
}

const SAVED_TIPS_KEY = 'SavedTips';

/**
 * Renders a daily tip card with optional AI insights and allows saving tips for later.
 *
 * @param {Props} props - Component props.
 * @param {import('../services').Tip} [props.tip] - Tip object to display; if omitted the component fetches the latest tip.
 * @param {string} [props.insight] - Optional AI-generated insight copy shown below the tip.
 * @param {string} [props.advice] - Optional advice text displayed under the insight.
 * @returns {JSX.Element|null} Tip card when data is available, otherwise null until a tip loads.
 */
const DailyTipCard: React.FC<Props> = ({ tip, insight, advice }) => {
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

  /**
   * Persists the currently displayed tip into AsyncStorage if it has not been saved already.
   * Uses a simple array under the SAVED_TIPS_KEY for retrieval by the saved tips screen.
   *
   * @returns {Promise<void>} Resolves once the tip has been written to storage or skipped if missing.
   */
  const saveTip = async () => {
    if (!currentTip) return;
    const raw = await AsyncStorage.getItem(SAVED_TIPS_KEY);
    const arr: Tip[] = raw ? JSON.parse(raw) : [];
    if (!arr.find((t) => t.id === currentTip.id && t.date === currentTip.date)) {
      arr.push(currentTip);
      await AsyncStorage.setItem(SAVED_TIPS_KEY, JSON.stringify(arr));
    }
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
      {insight ? (
        <View style={styles.insightBlock}>
          <Text style={styles.insightLabel}>Denný insight</Text>
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      ) : null}
      {advice ? <Text style={styles.adviceText}>{advice}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity onPress={saveTip} style={styles.actionPrimary}>
          <Text style={styles.actionPrimaryText}>Ulož</Text>
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
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  insightBlock: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  insightLabel: {
    color: '#3E2617',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  insightText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  adviceText: {
    color: '#F8E7D6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
});

export default DailyTipCard;
