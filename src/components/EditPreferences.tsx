import React, { useEffect, useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  View
} from 'react-native';
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
  const [userNotes, setUserNotes] = useState('');
  const [currentRecommendation, setCurrentRecommendation] = useState('');
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
        setCurrentRecommendation(data.ai_recommendation || '');
        // Vyčisti pole pre nové poznámky
        setUserNotes('');
      } catch (err) {
        Alert.alert('Chyba', 'Nepodarilo sa načítať profil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const generateAI = async (additionalNotes: string) => {
    try {
      // Vytvor prompt s históriou úprav
      let prompt = `Používateľ má tieto preferencie kávy: ${JSON.stringify(profile?.coffee_preferences)}.`;

      if (currentRecommendation) {
        prompt += ` Aktuálne odporúčanie: "${currentRecommendation}".`;
      }

      if (profile?.manual_input) {
        prompt += ` Predchádzajúce poznámky používateľa: "${profile.manual_input}".`;
      }

      prompt += ` Používateľ chce upraviť odporúčanie s týmito novými poznámkami: "${additionalNotes}". 
      Vytvor nové personalizované odporúčanie na kávu, ktoré zohľadňuje všetky tieto informácie. 
      Odpoveď napíš v slovenčine, priateľsky a stručne (max 3-4 vety).`;

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
              content: 'Si skúsený barista a coffee expert. Vytváraš personalizované odporúčania pre milovníkov kávy na základe ich preferencií a dodatočných požiadaviek.'
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 200,
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

    if (!userNotes.trim()) {
      Alert.alert('Upozornenie', 'Prosím, napíšte ako by ste chceli upraviť odporúčanie.');
      return;
    }

    setSaving(true);
    try {
      // Vygeneruj nové odporúčanie na základe poznámok
      const newRecommendation = await generateAI(userNotes);

      // Ulož históriu poznámok - pridaj k existujúcim
      const updatedManualInput = profile.manual_input
        ? `${profile.manual_input}\n---\n${new Date().toLocaleDateString('sk-SK')}: ${userNotes}`
        : `${new Date().toLocaleDateString('sk-SK')}: ${userNotes}`;

      const user = auth().currentUser;
      const token = await user?.getIdToken();
      const res = await fetch('http://10.0.2.2:3001/api/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ai_recommendation: newRecommendation,
          manual_input: updatedManualInput,
        }),
      });

      if (!res.ok) throw new Error('Uloženie zlyhalo');

      Alert.alert('✅ Uložené', 'Vaše preferencie boli aktualizované podľa vašich poznámok.');
      onBack();
    } catch (err) {
      Alert.alert('Chyba', 'Uloženie zlyhalo');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    Alert.alert(
      'Resetovať odporúčanie',
      'Chcete vygenerovať úplne nové odporúčanie len na základe vašich preferencií z dotazníka?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Resetovať',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const basicPrompt = `Používateľ má tieto preferencie kávy: ${JSON.stringify(profile?.coffee_preferences)}. 
              Vytvor personalizované odporúčanie na kávu. Odpoveď napíš v slovenčine, priateľsky a stručne (max 3-4 vety).`;

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
                    { role: 'user', content: basicPrompt },
                  ],
                  temperature: 0.4,
                  max_tokens: 200,
                }),
              });

              const data = await response.json();
              const newRecommendation = data?.choices?.[0]?.message?.content?.trim() || 'Nepodarilo sa získať odporúčanie.';

              const user = auth().currentUser;
              const token = await user?.getIdToken();
              const res = await fetch('http://10.0.2.2:3001/api/profile', {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ai_recommendation: newRecommendation,
                  manual_input: null, // Vymaž históriu
                }),
              });

              if (!res.ok) throw new Error('Reset zlyhal');

              setCurrentRecommendation(newRecommendation);
              setUserNotes('');
              Alert.alert('✅ Resetované', 'Odporúčanie bolo vygenerované nanovo.');
            } catch (err) {
              Alert.alert('Chyba', 'Reset zlyhal');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upraviť preferencie</Text>

      {/* Aktuálne odporúčanie - iba na čítanie */}
      <View style={styles.section}>
        <Text style={styles.label}>Vaše aktuálne odporúčanie:</Text>
        <View style={styles.currentRecommendation}>
          <Text style={styles.recommendationText}>
            {currentRecommendation || 'Zatiaľ nemáte žiadne odporúčanie. Vyplňte najprv dotazník preferencií.'}
          </Text>
        </View>
      </View>

      {/* Pole pre dodatočné poznámky */}
      <View style={styles.section}>
        <Text style={styles.label}>Ako by ste chceli upraviť toto odporúčanie?</Text>
        <Text style={styles.helperText}>
          Napríklad: "Chcel by som silnejšiu kávu", "Preferujem viac ovocné tóny", "Nemám rád horkú chuť"
        </Text>
        <TextInput
          value={userNotes}
          onChangeText={setUserNotes}
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={4}
          placeholder="Napíšte svoje poznámky k úprave odporúčania..."
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* História úprav ak existuje */}
      {profile?.manual_input && (
        <View style={styles.section}>
          <Text style={styles.label}>História vašich úprav:</Text>
          <View style={styles.historyBox}>
            <ScrollView style={styles.historyScroll} nestedScrollEnabled={true}>
              <Text style={styles.historyText}>{profile.manual_input}</Text>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Akčné tlačidlá */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.disabledButton]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Generujem nové odporúčanie...' : 'Uložiť a vygenerovať nové odporúčanie'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={handleReset}
        disabled={saving}
      >
        <Text style={styles.resetButtonText}>🔄 Resetovať odporúčanie</Text>
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
      padding: 20,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 20,
      color: colors.text,
    },
    section: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    helperText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
      fontStyle: 'italic',
    },
    currentRecommendation: {
      backgroundColor: colors.cardBackground,
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recommendationText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.cardBackground,
      color: colors.text,
      fontSize: 14,
    },
    multiline: {
      height: 100,
      textAlignVertical: 'top',
    },
    historyBox: {
      backgroundColor: colors.cardBackground,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 120,
    },
    historyScroll: {
      maxHeight: 100,
    },
    historyText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    saveButton: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 20,
      alignItems: 'center',
      marginBottom: 10,
    },
    disabledButton: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
    resetButton: {
      backgroundColor: colors.cardBackground,
      padding: 12,
      borderRadius: 20,
      alignItems: 'center',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resetButtonText: {
      color: colors.text,
      fontSize: 14,
    },
    backButton: {
      marginTop: 10,
      alignItems: 'center',
    },
    backButtonText: {
      color: colors.primary,
      fontSize: 16,
    },
  });

export default EditPreferences;