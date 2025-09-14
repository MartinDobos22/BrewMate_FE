import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tip } from '../services/contentServices';

interface Props {
  tip?: Tip;
}

const SAVED_TIPS_KEY = 'SavedTips';

const DailyTipCard: React.FC<Props> = ({ tip }) => {
  const [currentTip, setCurrentTip] = useState<Tip | null>(tip ?? null);

  useEffect(() => {
    if (tip) {
      setCurrentTip(tip);
    } else {
      AsyncStorage.getItem('lastTip').then((stored) => {
        if (stored) {
          setCurrentTip(JSON.parse(stored));
        }
      });
    }
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
