import React, { useEffect, useState } from 'react';
import { Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, useColorScheme } from 'react-native';
import auth from '@react-native-firebase/auth';
import { getColors, Colors } from '../theme/colors';

const OPENAI_API_KEY = "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";

interface ProfileData {
  coffee_preferences?: any;
  experience_level?: string;
  ai_recommendation?: string;
  manual_input?: string;
}

const EditPreferences = ({ onBack }: { onBack: () => void }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [manualText, setManualText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth().currentUser;
        const token = await user?.getIdToken();
        const res = await fetch('http://10.0.2.2:3001/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Nepodarilo sa načítať profil');
        const data = await res.json();
        setProfile(data);
        setManualText(data.manual_input || data.ai_recommendation || '');
      } catch (err) {
        Alert.alert('Chyba', 'Nepodarilo sa načítať profil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const generateAI = async (manual: string) => {
    try {
      const prompt = `Odpovede používateľa z formulára: ${JSON.stringify(profile?.coffee_preferences)}. Dodatočné poznámky: ${manual}. Vytvor personalizované odporúčanie na kávu.`;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'Si skúsený barista a coffee expert. Vytváraš personalizované odporúčania pre milovníkov kávy.'
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
        }),
      });
      const data = await response.json();
      return data?.choices?.[0]?.message?.content?.trim() || 'Nepodarilo sa získať odporúčanie.';
    } catch (err) {
      console.error('AI error:', err);
      return 'Nastala chyba pri generovaní odporúčania.';
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const aiRecommendation = await generateAI(manualText);
      const user = auth().currentUser;
      const token = await user?.getIdToken();
      const res = await fetch('http://10.0.2.2:3001/api/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ai_recommendation: aiRecommendation,
          manual_input: manualText,
        }),
      });
      if (!res.ok) throw new Error('Uloženie zlyhalo');
      Alert.alert('✅ Uložené', 'Preferencie boli aktualizované');
      onBack();
    } catch (err) {
      Alert.alert('Chyba', 'Uloženie zlyhalo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upraviť preferencie</Text>
      <Text style={styles.label}>Tvoje poznámky</Text>
      <TextInput
        value={manualText}
        onChangeText={setManualText}
        style={[styles.input, styles.multiline]}
        multiline
        numberOfLines={6}
        placeholder="Doplň alebo uprav svoje preferencie"
        placeholderTextColor={colors.textSecondary}
      />
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Ukladám...' : 'Uložiť'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Späť</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      padding: 30,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 20,
      color: colors.text,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 10,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 10,
      backgroundColor: colors.cardBackground,
      color: colors.text,
    },
    multiline: {
      height: 160,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    saveButton: {
      backgroundColor: colors.secondary,
      padding: 15,
      borderRadius: 20,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    backButton: {
      marginTop: 20,
      alignItems: 'center',
    },
    backButtonText: {
      color: colors.primary,
      fontSize: 16,
    },
  });

export default EditPreferences;

