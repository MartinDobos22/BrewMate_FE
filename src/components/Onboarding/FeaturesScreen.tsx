import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, StyleSheet, Button } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  onFinish: () => void;
}

const features = [
  { key: 'ocr', title: 'OCR sken', text: 'Skenuj recepty pomocou OCR.' },
  { key: 'ai', title: 'AI recepty', text: 'Generuj recepty s pomocou AI.' },
  { key: 'personal', title: 'Personalizácia', text: 'Prispôsob si aplikáciu svojim potrebám.' },
];

const { width } = Dimensions.get('window');

const FeaturesScreen: React.FC<Props> = ({ onFinish }) => {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setIndex(viewableItems[0].index);
    }
  }).current;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <FlatList
        data={features}
        horizontal
        pagingEnabled
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.card, { width }]}> 
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.text, { color: colors.textSecondary }]}>{item.text}</Text>
          </View>
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />
      {index === features.length - 1 && (
        <Button title="Začať" onPress={onFinish} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default FeaturesScreen;
