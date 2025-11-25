import React from 'react';
import { View, Text, Image, FlatList, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RecentScan } from '../../services/coffeeServices';

/**
 * Props for the carousel that displays recently scanned coffees.
 */
interface Props {
  /** Collection of recent scans to render, including identifiers and optional images. */
  scans: RecentScan[];
}

const ITEM_WIDTH = 120;

/**
 * Horizontal carousel that lists recently scanned coffees and enables navigation to detail screens
 * when tapped.
 *
 * @param {Props} props - Data required to render scan cards.
 * @returns {JSX.Element} The rendered carousel component.
 */
const RecentScansCarousel: React.FC<Props> = ({ scans }) => {
  const navigation = useNavigation<any>();

  /**
   * Renders an individual scan card with optional image and navigates to detail on press.
   *
   * @param {{ item: RecentScan }} param0 - Item data supplied by FlatList.
   * @returns {JSX.Element} The rendered card element.
   */
  const renderItem = ({ item }: { item: RecentScan }) => (
    <TouchableOpacity
      style={{ width: ITEM_WIDTH, marginRight: 12 }}
      onPress={() => navigation.navigate('CoffeeDetail', { id: item.id })}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: ITEM_WIDTH, height: ITEM_WIDTH, borderRadius: 8 }}
        />
      ) : (
        <View
          style={{
            width: ITEM_WIDTH,
            height: ITEM_WIDTH,
            borderRadius: 8,
            backgroundColor: '#eee',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text>☕</Text>
        </View>
      )}
      <Text style={{ marginTop: 4, textAlign: 'center' }}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      horizontal
      data={scans}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      snapToInterval={ITEM_WIDTH + 12}
      decelerationRate="fast"
    />
  );
};

export default RecentScansCarousel;
