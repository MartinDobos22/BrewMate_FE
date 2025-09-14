import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tip } from '../services/contentServices';

const SAVED_TIPS_KEY = 'SavedTips';

const SavedTipsScreen: React.FC = () => {
  const [tips, setTips] = useState<Tip[]>([]);

  const loadTips = async () => {
    const raw = await AsyncStorage.getItem(SAVED_TIPS_KEY);
    setTips(raw ? JSON.parse(raw) : []);
  };

  useEffect(() => {
    loadTips();
  }, []);

  const removeTip = async (id: number, date: string) => {
    const updated = tips.filter((t) => !(t.id === id && t.date === date));
    setTips(updated);
    await AsyncStorage.setItem(SAVED_TIPS_KEY, JSON.stringify(updated));
  };

  const renderItem = ({ item }: { item: Tip }) => (
    <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#ccc' }}>
      <Text style={{ fontWeight: 'bold' }}>{item.date}</Text>
      <Text>{item.text}</Text>
      <TouchableOpacity onPress={() => removeTip(item.id, item.date)}>
        <Text style={{ color: 'red' }}>Odstrániť</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList data={tips} keyExtractor={(item) => `${item.id}-${item.date}`} renderItem={renderItem} />
    </View>
  );
};

export default SavedTipsScreen;
