// CoffeePreferenceForm.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  useColorScheme,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { getColors } from '../../theme/colors';
import AIResponseDisplay from './AIResponseDisplay';
import { CONFIG } from '../../config/config';
import { BOTTOM_NAV_CONTENT_OFFSET } from '../navigation/BottomNav';
import { API_URL } from '../../services/api';

const OPENAI_API_KEY = CONFIG.OPENAI_API_KEY;

/**
 * Wrapper pre fetch s logovaním komunikácie FE ↔ BE.
 */
const loggedFetch = async (url: string, options: RequestInit) => {
  console.log('📤 [FE->BE]', url, options);
  const res = await fetch(url, options);
  console.log('📥 [BE->FE]', url, res.status);
  return res;
};

type TasteVector = {
  acidity: number;
  bitterness: number;
  sweetness: number;
  body: number;
  intensity: number;
  experimentalism: number;
};

interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  weights: Partial<TasteVector>;
}

interface Question {
  id: string;
  title: string;
  subtitle: string;
  options: QuestionOption[];
}

/**
 * Dotazník preferencií na základe ktorého sa vygeneruje AI odporúčanie.
 */
const CoffeePreferenceForm = ({
  onBack,
  onPreferencesSaved,
}: {
  onBack: () => void;
  onPreferencesSaved?: () => void;
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoading, setIsLoading] = useState(false);

  const colors = getColors(isDarkMode);
  const styles = createStyles(isDarkMode);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [responseVariant, setResponseVariant] = useState<'concise' | 'deep'>('concise');
  const [previousProfile, setPreviousProfile] = useState<{
    quiz_answers?: Record<string, string>;
    taste_vector?: TasteVector;
    ai_recommendation?: string;
    consistency_score?: number;
  } | null>(null);

  const SAFE_MODE_VECTOR: TasteVector = {
    acidity: 0.45,
    bitterness: 0.55,
    sweetness: 0.5,
    body: 0.55,
    intensity: 0.5,
    experimentalism: 0.35,
  };

  // Všetky otázky
  const allQuestions: Question[] = [
    {
      id: 'dealbreaker',
      title: '1️⃣ Čo ti na káve vadí najviac?',
      subtitle: 'Vždy len jedna odpoveď – žiadne „záleží“',
      options: [
        { value: 'A', label: 'A) kyslá chuť', weights: { acidity: 0.1, sweetness: 0.55 } },
        { value: 'B', label: 'B) silná horkosť', weights: { bitterness: 0.15, sweetness: 0.5 } },
        { value: 'C', label: 'C) vodová / prázdna chuť', weights: { body: 0.75, intensity: 0.55 } },
        { value: 'D', label: 'D) príliš silný nápoj', weights: { intensity: 0.2, bitterness: 0.3 } },
      ],
    },
    {
      id: 'go_to_drink',
      title: '2️⃣ Ktorý nápoj si vyberáš najčastejšie?',
      subtitle: 'Vzťah k intenzite a mlieku',
      options: [
        { value: 'A', label: 'A) espresso / ristretto', weights: { intensity: 0.8, bitterness: 0.65, body: 0.6, sweetness: 0.35 } },
        { value: 'B', label: 'B) cappuccino / flat white', weights: { intensity: 0.45, body: 0.65, sweetness: 0.55 } },
        { value: 'C', label: 'C) filtrovaná káva', weights: { acidity: 0.55, body: 0.35, intensity: 0.4, bitterness: 0.4 } },
        { value: 'D', label: 'D) sladké alebo ľadové kávové nápoje', weights: { sweetness: 0.75, intensity: 0.35, bitterness: 0.25 } },
      ],
    },
    {
      id: 'chocolate',
      title: '3️⃣ Ak by si mal vybrať jednu čokoládu:',
      subtitle: 'Horkosť × sladkosť',
      options: [
        { value: 'A', label: 'A) horká (70–85 %)', weights: { bitterness: 0.8, sweetness: 0.2 } },
        { value: 'B', label: 'B) mliečna', weights: { bitterness: 0.45, sweetness: 0.55 } },
        { value: 'C', label: 'C) biela', weights: { sweetness: 0.8, bitterness: 0.1 } },
        { value: 'D', label: 'D) čokoládu veľmi nemusím', weights: { sweetness: 0.4, bitterness: 0.35 } },
      ],
    },
    {
      id: 'fruit_notes',
      title: '4️⃣ Ovocné tóny v káve sú pre teba:',
      subtitle: 'Acidita',
      options: [
        { value: 'A', label: 'A) rušivé', weights: { acidity: 0.15 } },
        { value: 'B', label: 'B) v poriadku, ak sú jemné', weights: { acidity: 0.35 } },
        { value: 'C', label: 'C) zaujímavé', weights: { acidity: 0.6, experimentalism: 0.55 } },
        { value: 'D', label: 'D) presne to, čo hľadám', weights: { acidity: 0.85, experimentalism: 0.8 } },
      ],
    },
    {
      id: 'mouthfeel',
      title: '5️⃣ Ako má káva pôsobiť v ústach?',
      subtitle: 'Telo (mouthfeel)',
      options: [
        { value: 'A', label: 'A) ľahká a svieža', weights: { body: 0.25 } },
        { value: 'B', label: 'B) vyvážená', weights: { body: 0.5 } },
        { value: 'C', label: 'C) plná a krémová', weights: { body: 0.7, sweetness: 0.55 } },
        { value: 'D', label: 'D) hustá a výrazná', weights: { body: 0.9, intensity: 0.65 } },
      ],
    },
    {
      id: 'reason',
      title: '6️⃣ Prečo piješ kávu?',
      subtitle: 'Intenzita × rituál',
      options: [
        { value: 'A', label: 'A) chcem energiu', weights: { intensity: 0.85, bitterness: 0.55 } },
        { value: 'B', label: 'B) chcem si ju vychutnať', weights: { intensity: 0.5, sweetness: 0.55 } },
        { value: 'C', label: 'C) chcem ju piť dlhšie', weights: { intensity: 0.35, sweetness: 0.5, body: 0.55 } },
        { value: 'D', label: 'D) je to zvyk', weights: { intensity: 0.45 } },
      ],
    },
    {
      id: 'closest_flavor',
      title: '7️⃣ Ktorá chuť je ti najbližšia?',
      subtitle: 'Chuťové jadro',
      options: [
        { value: 'A', label: 'A) oriešky', weights: { body: 0.6, sweetness: 0.55, bitterness: 0.45 } },
        { value: 'B', label: 'B) čokoláda', weights: { bitterness: 0.6, body: 0.55, sweetness: 0.45 } },
        { value: 'C', label: 'C) karamel', weights: { sweetness: 0.7, body: 0.6 } },
        { value: 'D', label: 'D) ovocie', weights: { acidity: 0.7, sweetness: 0.45, experimentalism: 0.55 } },
      ],
    },
    {
      id: 'experimentation',
      title: '8️⃣ Ako reaguješ na nové chute?',
      subtitle: 'Experimentálnosť',
      options: [
        { value: 'A', label: 'A) nemám ich rád', weights: { experimentalism: 0.1 } },
        { value: 'B', label: 'B) skúsim, ak sú podobné tomu, čo poznám', weights: { experimentalism: 0.35 } },
        { value: 'C', label: 'C) rád experimentujem', weights: { experimentalism: 0.7 } },
        { value: 'D', label: 'D) cielene hľadám niečo netradičné', weights: { experimentalism: 0.9, acidity: 0.65 } },
      ],
    },
    {
      id: 'frequency',
      title: '9️⃣ Ako často piješ kávu?',
      subtitle: 'Tolerancia intenzity',
      options: [
        { value: 'A', label: 'A) príležitostne', weights: { intensity: 0.35 } },
        { value: 'B', label: 'B) 1–2 denne', weights: { intensity: 0.45 } },
        { value: 'C', label: 'C) 3–4 denne', weights: { intensity: 0.65 } },
        { value: 'D', label: 'D) viac ako 4 denne', weights: { intensity: 0.85, bitterness: 0.55 } },
      ],
    },
    {
      id: 'control',
      title: '🔟 KONTROLNÁ OTÁZKA (povinná)',
      subtitle: 'Vyber kávu bez rozmýšľania – validácia konzistencie',
      options: [
        { value: 'A', label: 'A) tmavé espresso', weights: { intensity: 0.8, bitterness: 0.7, body: 0.6 } },
        { value: 'B', label: 'B) cappuccino', weights: { intensity: 0.45, sweetness: 0.55, body: 0.6 } },
        { value: 'C', label: 'C) filtrovaná káva', weights: { acidity: 0.55, body: 0.35, intensity: 0.45 } },
        { value: 'D', label: 'D) sladká ľadová káva', weights: { sweetness: 0.75, intensity: 0.35, bitterness: 0.25 } },
      ],
    },
  ];

  const visibleQuestions = allQuestions;

  useEffect(() => {
    loadPreferences();
  }, []);

  /**
   * Načíta existujúce preferencie používateľa z backendu.
   */
  const loadPreferences = async () => {
    try {
      const user = auth().currentUser;
      const token = await user?.getIdToken();
      const res = await loggedFetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        console.log('📥 [BE] Loaded preferences:', data);
        if (data.coffee_preferences?.quiz_answers) {
          setAnswers(data.coffee_preferences.quiz_answers);
        }
        setPreviousProfile({
          quiz_answers: data.coffee_preferences?.quiz_answers,
          taste_vector: data.coffee_preferences?.taste_vector ?? data.taste_vector,
          ai_recommendation: data.coffee_preferences?.ai_recommendation ?? data.ai_recommendation,
          consistency_score: data.coffee_preferences?.consistency_score ?? data.consistency_score,
        });
      }
    } catch (err) {
      console.warn('Failed to load preferences:', err);
    }
  };

  /**
   * Spracuje odpoveď používateľa pre danú otázku.
   */
  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  /**
   * Získa aktuálnu hodnotu pre danú otázku.
   */
  const getValue = (questionId: string) => answers[questionId];

  const TASTE_DIMENSIONS: Array<keyof TasteVector> = ['acidity', 'bitterness', 'sweetness', 'body', 'intensity', 'experimentalism'];

  const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

  const calculateTasteVector = (quizAnswers: Record<string, string>): TasteVector => {
    const totals: Record<keyof TasteVector, { sum: number; count: number }> = {
      acidity: { sum: 0, count: 0 },
      bitterness: { sum: 0, count: 0 },
      sweetness: { sum: 0, count: 0 },
      body: { sum: 0, count: 0 },
      intensity: { sum: 0, count: 0 },
      experimentalism: { sum: 0, count: 0 },
    };

    allQuestions.forEach(question => {
      const choice = quizAnswers[question.id];
      if (!choice) return;
      const option = question.options.find(opt => opt.value === choice);
      if (!option) return;

      Object.entries(option.weights).forEach(([dimension, value]) => {
        totals[dimension as keyof TasteVector].sum += value as number;
        totals[dimension as keyof TasteVector].count += 1;
      });
    });

    const result: TasteVector = { ...SAFE_MODE_VECTOR };

    TASTE_DIMENSIONS.forEach(dimension => {
      const { sum, count } = totals[dimension];
      if (count > 0) {
        result[dimension] = clamp01((SAFE_MODE_VECTOR[dimension] + sum) / (count + 1));
      } else {
        result[dimension] = clamp01(result[dimension]);
      }
    });

    return result;
  };

  const getAnswerLabel = (questionId: string, quizAnswers: Record<string, string>) => {
    const question = allQuestions.find(q => q.id === questionId);
    const selectedValue = quizAnswers[questionId];
    const option = question?.options.find(opt => opt.value === selectedValue);
    return option?.label || 'neodpovedané';
  };

  const callOpenAIJsonSchema = async (
    systemPrompt: string,
    userPrompt: string,
    temperature = 0.2,
  ): Promise<string | undefined> => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'coffee_preference_profile',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                ai_recommendation: {
                  type: 'string',
                },
                taste_vector: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    acidity: { type: 'number', minimum: 0, maximum: 1 },
                    bitterness: { type: 'number', minimum: 0, maximum: 1 },
                    sweetness: { type: 'number', minimum: 0, maximum: 1 },
                    body: { type: 'number', minimum: 0, maximum: 1 },
                    intensity: { type: 'number', minimum: 0, maximum: 1 },
                    experimentalism: { type: 'number', minimum: 0, maximum: 1 },
                  },
                  required: [
                    'acidity',
                    'bitterness',
                    'sweetness',
                    'body',
                    'intensity',
                    'experimentalism',
                  ],
                },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
              },
              required: ['ai_recommendation', 'taste_vector', 'confidence'],
            },
          },
        },
      }),
    });

    const data = await response.json();
    console.log('📥 [OpenAI] prefs response:', data);
    return data?.choices?.[0]?.message?.content?.trim();
  };

  /**
   * Zavolá OpenAI a vygeneruje odporúčanie podľa nového chuťového vektora.
   */
  const generateAIRecommendation = async (
    fallbackVector: TasteVector,
    quizAnswers: Record<string, string>,
    variant: 'concise' | 'deep',
    priorProfile: typeof previousProfile,
  ): Promise<{ tasteVector: TasteVector; confidence: number; profileText: string }> => {
    if (!OPENAI_API_KEY) {
      console.error('Chýba OpenAI API key. Odporúčanie sa nevygeneruje.');
      return {
        tasteVector: fallbackVector,
        confidence: 0.6,
        profileText: 'Nastala chyba pri generovaní odporúčania.',
      };
    }

    try {
      const orderedQuestions = [
        'dealbreaker',
        'go_to_drink',
        'chocolate',
        'fruit_notes',
        'mouthfeel',
        'reason',
        'closest_flavor',
        'experimentation',
        'frequency',
        'control',
      ];

      const answerMap: Record<string, string> = {};
      orderedQuestions.forEach((id, idx) => {
        answerMap[`Q${idx + 1}`] = getAnswerLabel(id, quizAnswers);
      });

      const previousAnswerMap: Record<string, string> = {};
      orderedQuestions.forEach((id, idx) => {
        previousAnswerMap[`Q${idx + 1}`] = priorProfile?.quiz_answers
          ? getAnswerLabel(id, priorProfile.quiz_answers)
          : 'neznáme';
      });

      const systemPrompt = `You are a deterministic coffee preference profiling engine.
You must produce JSON that adheres exactly to the provided schema.
You do not output any extra keys or prose.
Safety constraints:
- No medical or health claims.
- No absolute guarantees (avoid "always", "never", "guaranteed").
- No diagnosing, treatment, or caffeine/health advice.
Use neutral, professional language.`;

      const userPrompt = `Generate a coffee preference profile based on the questionnaire answers.

Variant: ${variant}
Language: Slovak

Current questionnaire answers (labels):
Q1: ${answerMap.Q1}
Q2: ${answerMap.Q2}
Q3: ${answerMap.Q3}
Q4: ${answerMap.Q4}
Q5: ${answerMap.Q5}
Q6: ${answerMap.Q6}
Q7: ${answerMap.Q7}
Q8: ${answerMap.Q8}
Q9: ${answerMap.Q9}
Q10: ${answerMap.Q10}

Previous questionnaire answers (labels, if any):
Q1: ${previousAnswerMap.Q1}
Q2: ${previousAnswerMap.Q2}
Q3: ${previousAnswerMap.Q3}
Q4: ${previousAnswerMap.Q4}
Q5: ${previousAnswerMap.Q5}
Q6: ${previousAnswerMap.Q6}
Q7: ${previousAnswerMap.Q7}
Q8: ${previousAnswerMap.Q8}
Q9: ${previousAnswerMap.Q9}
Q10: ${previousAnswerMap.Q10}

Previous profile (if any):
${JSON.stringify(
        {
          taste_vector: priorProfile?.taste_vector ?? null,
          ai_recommendation: priorProfile?.ai_recommendation ?? null,
          consistency_score: priorProfile?.consistency_score ?? null,
        },
        null,
        2,
      )}

Fallback taste vector (computed from weights):
${JSON.stringify(fallbackVector, null, 2)}

Rules for taste_vector:
- Output floats between 0.0 and 1.0
- Adjust based on current answers
- Consider deltas vs previous profile to mention changes in the recommendation

Rules for ai_recommendation:
- If Variant is "concise": 2-3 sentences max
- If Variant is "deep": 5-7 sentences, include nuance
- No specific coffee product recommendations
- Mention uncertainty if confidence < 0.85
- Do not use absolutes or medical claims

Rules for confidence:
- 0.6 to 1.0 based on consistency of answers
- Lower confidence if answers conflict or changed drastically vs previous profile

Return JSON only.`;

      console.log('📤 [OpenAI] prefs prompt:', userPrompt);
      const aiResponse = await callOpenAIJsonSchema(systemPrompt, userPrompt, 0.2);

      let tasteVector = fallbackVector;
      let confidence = 0.8;
      let profileText = 'Nepodarilo sa získať odporúčanie.';
      try {
        const parsed = aiResponse ? JSON.parse(aiResponse) : null;
        tasteVector = { ...fallbackVector, ...(parsed?.taste_vector ?? {}) };
        confidence = parsed?.confidence ?? confidence;
        profileText = parsed?.ai_recommendation ?? profileText;
      } catch (err) {
        console.warn('⚠️  Parsing profile failed, using fallback.', err);
      }

      return {
        tasteVector,
        confidence,
        profileText,
      };
    } catch (err) {
      console.error('AI error:', err);
      return {
        tasteVector: fallbackVector,
        confidence: 0.6,
        profileText: 'Nastala chyba pri generovaní odporúčania.',
      };
    }
  };

  /**
   * Uloží vyplnené preferencie a zobrazí odporúčanie.
   */
  const handleSubmit = async () => {
    const unanswered = allQuestions.filter(question => !answers[question.id]);
    if (unanswered.length) {
      Alert.alert('Chýbajú odpovede', `Vyber odpoveď pre otázku: ${unanswered[0].title}`);
      return;
    }

    setIsLoading(true);
    const fallbackTasteVector = calculateTasteVector(answers);

    const { tasteVector, confidence, profileText } = await generateAIRecommendation(
      fallbackTasteVector,
      answers,
      responseVariant,
      previousProfile,
    );

    const preferences = {
      quiz_version: 'taste-2024-10',
      quiz_answers: answers,
      taste_vector: tasteVector,
      consistency_score: confidence,
      ai_confidence: confidence,
    };

    try {
      const user = auth().currentUser;
      const token = await user?.getIdToken();

      const res = await loggedFetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coffee_preferences: preferences,
          taste_vector: tasteVector,
          ai_recommendation: profileText,
          ai_confidence: confidence,
        }),
      });
      const resData = await res.json().catch(() => null);
      console.log('📥 [BE] Save response:', resData);
      if (!res.ok) throw new Error('Failed to save preferences');
      setRecommendation(profileText);
      setShowRecommendation(true);
      onPreferencesSaved?.();
    } catch (err) {
      Alert.alert('Chyba', 'Nepodarilo sa uložiť preferencie');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Vyrenderuje jednu otázku dotazníka vrátane možností odpovedí.
   */
  const renderQuestion = (question: Question) => {
    const currentValue = getValue(question.id);

    return (
      <View key={question.id} style={styles.questionContainer}>
        <Text style={styles.questionTitle}>{question.title}</Text>
        <Text style={styles.questionSubtitle}>{question.subtitle}</Text>

        <View style={styles.optionsContainer}>
          {question.options?.map(option => {
            const isSelected = currentValue === option.value;

            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected
                ]}
                onPress={() => handleAnswer(question.id, option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionTextContainer}>
                  <Text style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text style={[
                      styles.optionDescription,
                      isSelected && styles.optionDescriptionSelected
                    ]}>
                      {option.description}
                    </Text>
                  )}
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chuťový dotazník</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Pravidlá</Text>
          <Text style={styles.introText}>• Vždy 1 odpoveď, žiadne „záleží“.</Text>
          <Text style={styles.introText}>• Nútený výber, odpovede sa mapujú na váhy 0–1.</Text>
          <Text style={styles.introText}>• Prvá predikcia je SAFE MODE: utlmené extrémy, čokoláda/oriešky/stredné telo.</Text>
        </View>
        <View style={styles.variantContainer}>
          <Text style={styles.variantLabel}>Typ odporúčania</Text>
          <View style={styles.variantButtons}>
            <TouchableOpacity
              style={[
                styles.variantButton,
                responseVariant === 'concise' && styles.variantButtonSelected,
              ]}
              onPress={() => setResponseVariant('concise')}
            >
              <Text
                style={[
                  styles.variantButtonText,
                  responseVariant === 'concise' && styles.variantButtonTextSelected,
                ]}
              >
                Stručné
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.variantButton,
                responseVariant === 'deep' && styles.variantButtonSelected,
              ]}
              onPress={() => setResponseVariant('deep')}
            >
              <Text
                style={[
                  styles.variantButtonText,
                  responseVariant === 'deep' && styles.variantButtonTextSelected,
                ]}
              >
                Detailné
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {visibleQuestions.map(question => renderQuestion(question))}

        {/* Submit Button */}
        <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Ukladám...' : 'Uložiť preferencie ✓'}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {showRecommendation && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showRecommendation}
          onRequestClose={() => setShowRecommendation(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowRecommendation(false)}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>

              <ScrollView showsVerticalScrollIndicator={false}>
                <AIResponseDisplay
                  text={recommendation}
                  type="recommendation"
                  animate={true}
                />
              </ScrollView>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={() => {
                  setShowRecommendation(false);
                  onBack();
                }}
              >
                <Text style={styles.continueButtonText}>Pokračovať</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

/**
 * Vytvorí štýly komponentu podľa aktuálneho farebného režimu.
 */
const createStyles = (isDarkMode: boolean) => {
  const colors = getColors(isDarkMode);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeText: {
      fontSize: 24,
      color: colors.text,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    introCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 16,
      marginBottom: 8,
    },
    introTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 6,
    },
    introText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    variantContainer: {
      marginTop: 12,
      marginBottom: 4,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    variantLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    variantButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    variantButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    variantButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.1)',
    },
    variantButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    variantButtonTextSelected: {
      color: colors.primary,
    },
    questionContainer: {
      paddingVertical: 25,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    questionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    questionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    optionsContainer: {
      gap: 8,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 14,
      borderWidth: 2,
      borderColor: colors.border,
      marginBottom: 8,
    },
    optionCardSelected: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.1)',
    },
    optionTextContainer: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    optionLabelSelected: {
      color: colors.primary,
    },
    optionDescription: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    optionDescriptionSelected: {
      color: colors.primaryLight,
    },
    checkmark: {
      fontSize: 18,
      color: colors.primary,
      fontWeight: 'bold',
    },
    submitButton: {
      backgroundColor: colors.primary,
      paddingVertical: 18,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 30,
      marginBottom: 20,
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    bottomPadding: {
      height: BOTTOM_NAV_CONTENT_OFFSET,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxHeight: '80%',
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 20,
    },
    modalCloseButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCloseButtonText: {
      fontSize: 24,
      color: colors.text,
    },
    continueButton: {
      marginTop: 20,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    continueButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
};

export default CoffeePreferenceForm;
