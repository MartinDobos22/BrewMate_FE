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
import { getColors, Colors } from '../../theme/colors';
import { getSafeAreaTop, getSafeAreaBottom, scale, verticalScale } from '../utils/safeArea';
import { AIResponseDisplay } from './AIResponseDisplay';
import { API_URL } from '../../services/api';
import {
  DEFAULT_TASTE_VECTOR,
  buildFallbackAIResponse,
  buildRecommendationText,
  callOpenAIJsonSchema,
  normalizeTasteVectorTo01,
  normalizeTasteVectorTo10,
  parseTasteAIResponse,
  TASTE_AI_SCHEMA_PROMPT,
  TasteVector,
} from './tasteAiUtils';

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
  taste_vector?: TasteVector;
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
        const res = await loggedFetch(`${API_URL}/profile`, {
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
  const getFallbackTasteVector = () => {
    const vector =
      profile?.coffee_preferences?.taste_vector ?? profile?.taste_vector ?? DEFAULT_TASTE_VECTOR;
    return normalizeTasteVectorTo10(vector);
  };

  const generateAI = async (additionalNotes: string, options?: { reset?: boolean }) => {
    try {
      const fallbackVector = getFallbackTasteVector();
      const normalizedFallbackVector = normalizeTasteVectorTo01(fallbackVector);
      const fallback = buildFallbackAIResponse(normalizedFallbackVector);
      const isReset = options?.reset;

      const systemPrompt = `Si deterministický engine pre chuťové profily kávy.
Výstup musí byť výhradne JSON podľa schémy (bez Markdownu, bez extra textu).
Jazyk odpovede: slovenčina.
Bez medicínskych tvrdení, bez zdravotných rád, bez absolútnych garancií.
Ak sú údaje neúplné, doplň bezpečné defaulty namiesto vynechávania kľúčov.`;

      let prompt = `Uprav odporúčanie na kávu podľa preferencií používateľa.
Language: Slovak

Preferences snapshot:
${JSON.stringify(profile?.coffee_preferences ?? {}, null, 2)}

Fallback taste vector (computed from profile if available):
${JSON.stringify(normalizedFallbackVector, null, 2)}`;

      if (!isReset && currentRecommendation) {
        prompt += `\n\nCurrent recommendation:\n${currentRecommendation}`;
      }

      if (!isReset && profile?.manual_input) {
        prompt += `\n\nPrevious manual notes:\n${profile.manual_input}`;
      }

      if (!isReset) {
        prompt += `\n\nNew manual notes to apply:\n${additionalNotes}`;
      }

      if (isReset) {
        prompt += `\n\nReset request: ignore previous recommendations and notes, generate a fresh profile.`;
      }

      prompt += `\n\nRules for ai_recommendation:
- 3-4 sentences, friendly tone
- No specific coffee product recommendations
- Mention uncertainty if confidence < 0.85
- Do not use absolutes or medical claims

Rules for taste_vector:
- Output floats between 0.0 and 1.0
- Include all 6 dimensions (acidity, bitterness, sweetness, body, intensity, experimentalism)
- Adjust based on the notes and preferences

Rules for confidence:
- 0.6 to 1.0 based on clarity and consistency
- Lower confidence if notes conflict with existing preferences

Rules for explanations:
- 2-3 sentences explaining how the notes/preferences shaped the result

Rules for next_steps:
- 2-3 actionable, short steps the user can try

Rules for deltas:
- Short sentences describing what changed vs the previous recommendation
- If this is a reset, return an empty array

${TASTE_AI_SCHEMA_PROMPT}`;

      console.log('📤 [BE] prompt:', prompt);
      const aiResponse = await callOpenAIJsonSchema(systemPrompt, prompt, 0);

      // Validate and coerce the structured JSON so invalid output does not break the UI.
      const { response: parsedResponse, warnings } = parseTasteAIResponse(
        aiResponse,
        normalizedFallbackVector,
      );
      // Fall back to a safe default if the model omitted fields or returned malformed JSON.
      if (warnings.length > 0) {
        console.warn('⚠️  AI response validation warnings:', warnings);
      }

      return buildRecommendationText(parsedResponse);
    } catch (err) {
      console.error('AI error:', err);
      const fallback = buildFallbackAIResponse(getFallbackTasteVector());
      return buildRecommendationText(fallback);
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
      const res = await loggedFetch(`${API_URL}/profile`, {
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
              const newRecommendation = await generateAI('', { reset: true });

              const user = auth().currentUser;
              const token = await user?.getIdToken();
              const res = await loggedFetch(`${API_URL}/profile`, {
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
      paddingVertical: verticalScale(12),
      paddingTop: Platform.OS === 'ios' ? verticalScale(12) : verticalScale(16) + getSafeAreaTop(),
    },
    headerButton: {
      width: scale(36),
      height: verticalScale(36),
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
      paddingBottom: getSafeAreaBottom() + verticalScale(30),
    },
    section: {
      marginBottom: verticalScale(20),
    },
    label: {
      fontSize: scale(16),
      fontWeight: '600',
      color: colors.text,
      marginBottom: verticalScale(8),
    },
    helperText: {
      fontSize: scale(13),
      color: colors.textSecondary,
      marginBottom: verticalScale(10),
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
      marginBottom: verticalScale(8),
    },
    recommendationText: {
      color: colors.text,
      fontSize: scale(14),
      lineHeight: verticalScale(20),
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
      height: verticalScale(100),
      textAlignVertical: 'top',
    },
    historyBox: {
      backgroundColor: colors.cardBackground,
      padding: scale(12),
      borderRadius: scale(12),
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: verticalScale(120),
    },
    historyScroll: {
      maxHeight: verticalScale(100),
    },
    historyText: {
      color: colors.textSecondary,
      fontSize: scale(12),
      lineHeight: verticalScale(18),
    },
    buttonsContainer: {
      marginTop: verticalScale(10),
    },
    saveButton: {
      backgroundColor: colors.primary,
      padding: scale(15),
      borderRadius: scale(20),
      alignItems: 'center',
      marginBottom: verticalScale(10),
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
