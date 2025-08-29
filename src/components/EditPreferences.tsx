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
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { getColors, Colors } from '../theme/colors';
import { getSafeAreaTop, getSafeAreaBottom, scale } from './utils/safeArea';
import { AIResponseDisplay } from './AIResponseDisplay';
import { CONFIG } from '../config/config';

const OPENAI_API_KEY = CONFIG.OPENAI_API_KEY;

/**
 * Jednoduchý wrapper pre fetch s logovaním komunikácie FE ↔ BE.
 */
const loggedFetch = async (url: string, options: RequestInit) => {
  console.log('📤 [FE->BE]', url, options);
  const res = await fetch(url, options);
  console.log('📥 [BE->FE]', url, res.status);
  return res;
};

interface ProfileData {
  coffee_preferences?: any;
  experience_level?: string;
  ai_recommendation?: string;
  manual_input?: string;
}

/**
 * Komponent umožňujúci používateľovi upraviť preferencie a AI odporúčanie.
 */
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
        const res = await loggedFetch('http://10.0.2.2:3001/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Nepodarilo sa načítať profil');
        const data = await res.json();
        console.log('📥 [BE] Profile:', data);
        setProfile(data);
        setCurrentRecommendation(data.ai_recommendation || '');
        setUserNotes('');
      } catch (err) {
        Alert.alert('Chyba', 'Nepodarilo sa načítať profil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /**
   * Vygeneruje nové AI odporúčanie podľa zadaných poznámok.
   */
  const generateAI = async (additionalNotes: string) => {
    if (!OPENAI_API_KEY) {
      console.error('Chýba OpenAI API key. Odporúčanie sa nevygeneruje.');
      return 'Nastala chyba pri generovaní odporúčania.';
    }

    try {
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

      console.log('📤 [OpenAI] prompt:', prompt);
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
      console.log('📥 [OpenAI] response:', data);
      return data?.choices?.[0]?.message?.content?.trim() || 'Nepodarilo sa získať odporúčanie.';
    } catch (err) {
      console.error('AI error:', err);
      return 'Nastala chyba pri generovaní odporúčania.';
    }
  };

  /**
   * Uloží aktualizované odporúčanie na backend.
   */
  const handleSave = async () => {
    if (!profile) return;

    if (!userNotes.trim()) {
      Alert.alert('Upozornenie', 'Prosím, napíšte ako by ste chceli upraviť odporúčanie.');
      return;
    }

    setSaving(true);
    try {
      const newRecommendation = await generateAI(userNotes);

      const updatedManualInput = profile.manual_input
        ? `${profile.manual_input}\n---\n${new Date().toLocaleDateString('sk-SK')}: ${userNotes}`
        : `${new Date().toLocaleDateString('sk-SK')}: ${userNotes}`;

      const user = auth().currentUser;
      const token = await user?.getIdToken();
      const res = await loggedFetch('http://10.0.2.2:3001/api/profile', {
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

  /**
   * Resetuje odporúčanie a vygeneruje úplne nové.
   */
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

              console.log('📤 [OpenAI] reset prompt:', basicPrompt);
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
              console.log('📥 [OpenAI] reset response:', data);
              const newRecommendation = data?.choices?.[0]?.message?.content?.trim() || 'Nepodarilo sa získať odporúčanie.';

              const user = auth().currentUser;
              const token = await user?.getIdToken();
              const res = await loggedFetch('http://10.0.2.2:3001/api/profile', {
                method: 'PUT',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  ai_recommendation: newRecommendation,
                  manual_input: null,
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
          <Text style={styles.headerTitle}>Upraviť preferencie</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}>
          <Text style={styles.headerButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upraviť preferencie</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : scale(20)}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Aktuálne odporúčanie */}
          <View style={styles.section}>
            <View style={styles.currentRecommendation}>
              <Text style={styles.recommendationTitle}>Aktuálne odporúčanie:</Text>
              {currentRecommendation ? (
                <AIResponseDisplay
                  text={currentRecommendation}
                  type="recommendation"
                  animate={false}
                />
              ) : (
                <Text style={styles.recommendationText}>
                  Zatiaľ nemáte žiadne odporúčanie. Vyplňte najprv dotazník preferencií.
                </Text>
              )}
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
              textAlignVertical="top"
            />
          </View>

          {/* História úprav */}
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
          <View style={styles.buttonsContainer}>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: scale(16),
      paddingVertical: scale(12),
      paddingTop: Platform.OS === 'ios' ? scale(12) : scale(16) + getSafeAreaTop(),
    },
    headerButton: {
      width: scale(36),
      height: scale(36),
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: scale(18),
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerButtonText: {
      color: 'white',
      fontSize: scale(20),
      fontWeight: '600',
    },
    headerTitle: {
      color: 'white',
      fontSize: scale(18),
      fontWeight: '700',
    },
    headerPlaceholder: {
      width: scale(36),
    },
    content: {
      flex: 1,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      padding: scale(16),
      paddingBottom: getSafeAreaBottom() + scale(30),
    },
    section: {
      marginBottom: scale(20),
    },
    label: {
      fontSize: scale(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: scale(8),
    },
    helperText: {
      fontSize: scale(13),
      color: colors.textSecondary,
      marginBottom: scale(10),
      fontStyle: 'italic',
    },
    currentRecommendation: {
      backgroundColor: colors.cardBackground,
      padding: scale(15),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: colors.border,
    },
    recommendationTitle: {
      fontSize: scale(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: scale(8),
    },
    recommendationText: {
      color: colors.text,
      fontSize: scale(14),
      lineHeight: scale(20),
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: scale(12),
      padding: scale(12),
      backgroundColor: colors.cardBackground,
      color: colors.text,
      fontSize: scale(14),
    },
    multiline: {
      height: scale(100),
      textAlignVertical: 'top',
    },
    historyBox: {
      backgroundColor: colors.cardBackground,
      padding: scale(12),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: scale(120),
    },
    historyScroll: {
      maxHeight: scale(100),
    },
    historyText: {
      color: colors.textSecondary,
      fontSize: scale(12),
      lineHeight: scale(18),
    },
    buttonsContainer: {
      marginTop: scale(10),
    },
    saveButton: {
      backgroundColor: colors.primary,
      padding: scale(15),
      borderRadius: scale(20),
      alignItems: 'center',
      marginBottom: scale(10),
    },
    disabledButton: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: scale(15),
    },
    resetButton: {
      backgroundColor: colors.cardBackground,
      padding: scale(12),
      borderRadius: scale(20),
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    resetButtonText: {
      color: colors.text,
      fontSize: scale(14),
    },
  });

export default EditPreferences;