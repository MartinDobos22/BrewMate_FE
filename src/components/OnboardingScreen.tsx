import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeProvider';

interface OnboardingScreenProps {
  onFinish: () => void;
}

const pages = [
  {
    title: 'Vitajte v BrewMate',
    text: 'Objavte recepty a odporúčania pre vašu dokonalú kávu.',
  },
  {
    title: 'Skenovanie',
    text: 'Použite fotoaparát na skenovanie kávy a receptov.',
  },
  {
    title: 'Povolenia',
    text: 'Aplikácia potrebuje prístup k fotoaparátu na skenovanie a k úložisku pre uloženie vašich preferencií.',
  },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const [page, setPage] = useState(0);
  const { colors } = useTheme();

  const handleNext = async () => {
    if (page < pages.length - 1) {
      setPage(page + 1);
    } else {
      await AsyncStorage.setItem('onboardingComplete', 'true');
      onFinish();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.title, { color: colors.text }]}>{pages[page].title}</Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>{pages[page].text}</Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={handleNext}
      >
        <Text style={[styles.buttonText, { color: colors.cardBackground }]}> 
          {page === pages.length - 1 ? 'Dokončiť' : 'Ďalej'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;

