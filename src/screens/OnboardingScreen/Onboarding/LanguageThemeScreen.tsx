import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../../../theme/ThemeProvider';

interface Props {
  navigation: any;
}

const LanguageThemeScreen: React.FC<Props> = ({ navigation }) => {
  const { isDark, setScheme, colors } = useTheme();
  const [language, setLanguage] = useState('sk');
  const [darkMode, setDarkMode] = useState(isDark);

  const handleContinue = async () => {
    await AsyncStorage.setItem('@AppLang', language);
    setScheme(darkMode ? 'dark' : 'light');
    navigation.navigate('Permissions');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.label, { color: colors.text }]}>Vyber jazyk</Text>
      <Picker
        selectedValue={language}
        onValueChange={(value) => setLanguage(value)}
        style={styles.picker}
      >
        <Picker.Item label="Slovenčina" value="sk" />
        <Picker.Item label="English" value="en" />
      </Picker>
      <View style={styles.switchRow}>
        <Text style={[styles.label, { color: colors.text }]}>Tmavý režim</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} />
      </View>
      <Button title="Pokračovať" onPress={handleContinue} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  picker: {
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
});

export default LanguageThemeScreen;
