import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearScheduledDailyTipRefresh,
  fetchDailyTip,
  getScheduledDailyTipRefreshHandle,
  getTipFromCache,
  scheduleDailyTipRefresh,
  Tip,
} from '../services/contentServices';

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

  return (
    <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 8 }}>
      <Text>{currentTip.text}</Text>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <TouchableOpacity onPress={saveTip} style={{ marginRight: 16 }}>
          <Text>Ulož</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={shareTip}>
          <Text>Zdieľaj</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DailyTipCard;
