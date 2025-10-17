// CoffeePreferenceForm.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
  useColorScheme,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { getColors } from '../../theme/colors';
import AIResponseDisplay from './AIResponseDisplay';
import { CONFIG } from '../../config/config';
import { BOTTOM_NAV_HEIGHT } from '../navigation/BottomNav';

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

interface Question {
  id: string;
  title: string;
  subtitle: string;
  type: 'single' | 'multiple' | 'switch';
  options?: { value: string; label: string; emoji?: string; description?: string }[];
  section: 'basic' | 'intermediate' | 'expert';
}

/**
 * Dotazník preferencií na základe ktorého sa vygeneruje AI odporúčanie.
 */
const CoffeePreferenceForm = ({ onBack }: { onBack: () => void }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const [isLoading, setIsLoading] = useState(false);

  const colors = getColors(isDarkMode);
  const styles = createStyles(isDarkMode);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [recommendation, setRecommendation] = useState('');
  // Odpovede používateľa
  const [experienceLevel, setExperienceLevel] = useState<'beginner' | 'intermediate' | 'expert'>('beginner');
  const [intensity, setIntensity] = useState<'light' | 'medium' | 'strong'>('medium');
  const [sweetness, setSweetness] = useState<'none' | 'little' | 'medium' | 'sweet'>('little');
  const [milk, setMilk] = useState(false);
  const [temperature, setTemperature] = useState<'hot' | 'iced' | 'both'>('hot');
  const [roast, setRoast] = useState<'light' | 'medium' | 'dark'>('medium');
  const [preferredDrinks, setPreferredDrinks] = useState<string[]>([]);
  const [brewMethod, setBrewMethod] = useState<string[]>([]);
  const [grind, setGrind] = useState<'coarse' | 'medium' | 'fine'>('medium');
  const [flavorNotes, setFlavorNotes] = useState<string[]>([]);
  const [acidity, setAcidity] = useState<'low' | 'medium' | 'high'>('medium');
  const [body, setBody] = useState<'light' | 'medium' | 'full'>('medium');

  // Všetky otázky
  const allQuestions: Question[] = [
    {
      id: 'experience',
      title: '👋 Aká je tvoja skúsenosť s kávou?',
      subtitle: 'Pomôže nám to prispôsobiť otázky',
      type: 'single',
      section: 'basic',
      options: [
        {
          value: 'beginner',
          label: 'Začiatočník',
          emoji: '🌱',
          description: 'Pijem kávu občas, nerozumiem pojmom'
        },
        {
          value: 'intermediate',
          label: 'Milovník kávy',
          emoji: '☕',
          description: 'Mám obľúbené druhy, poznám rozdiely'
        },
        {
          value: 'expert',
          label: 'Kávový nadšenec',
          emoji: '🎯',
          description: 'Rozumiem detailom, mám vlastný mlynček'
        },
      ],
    },
    {
      id: 'intensity',
      title: '💪 Ako silnú kávu preferuješ?',
      subtitle: 'Ovplyvňuje to chuť a obsah kofeínu',
      type: 'single',
      section: 'basic',
      options: [
        {
          value: 'light',
          label: 'Jemnú',
          emoji: '🌤️',
          description: 'Ľahká, osviežujúca'
        },
        {
          value: 'medium',
          label: 'Strednú',
          emoji: '⚖️',
          description: 'Vyvážená chuť'
        },
        {
          value: 'strong',
          label: 'Silnú',
          emoji: '💥',
          description: 'Výrazná, intenzívna'
        },
      ],
    },
    {
      id: 'sweetness',
      title: '🍯 Máš rád sladkú kávu?',
      subtitle: 'Niektoré kávy majú prirodzenú sladkosť',
      type: 'single',
      section: 'basic',
      options: [
        { value: 'none', label: 'Bez sladkosti', emoji: '🚫' },
        { value: 'little', label: 'Mierne sladká', emoji: '🤏' },
        { value: 'medium', label: 'Stredne sladká', emoji: '👌' },
        { value: 'sweet', label: 'Sladká', emoji: '🬸' },
      ],
    },
    {
      id: 'milk',
      title: '🥛 Piješ kávu s mliekom?',
      subtitle: 'Mlieko zjemňuje chuť a znižuje horkosť',
      type: 'switch',
      section: 'basic',
    },
    {
      id: 'temperature',
      title: '🌡️ Aká teplota kávy ti vyhovuje?',
      subtitle: 'Teplota ovplyvňuje chuť',
      type: 'single',
      section: 'basic',
      options: [
        { value: 'hot', label: 'Horúca', emoji: '🔥' },
        { value: 'iced', label: 'Ľadová', emoji: '🧊' },
        { value: 'both', label: 'Oboje', emoji: '🔄' },
      ],
    },
    {
      id: 'roast',
      title: '🔥 Aké praženie preferuješ?',
      subtitle: 'Ovplyvňuje chuť a arómu',
      type: 'single',
      section: 'intermediate',
      options: [
        {
          value: 'light',
          label: 'Svetlé',
          emoji: '🌅',
          description: 'Ovocné, kyslé tóny'
        },
        {
          value: 'medium',
          label: 'Stredné',
          emoji: '🌤️',
          description: 'Vyvážené, karamelové'
        },
        {
          value: 'dark',
          label: 'Tmavé',
          emoji: '🌑',
          description: 'Čokoládové, dymové'
        },
      ],
    },
    {
      id: 'drinks',
      title: '☕ Aké kávové nápoje máš rád?',
      subtitle: 'Môžeš vybrať viacero',
      type: 'multiple',
      section: 'intermediate',
      options: [
        { value: 'espresso', label: 'Espresso', emoji: '🔵' },
        { value: 'americano', label: 'Americano', emoji: '💧' },
        { value: 'cappuccino', label: 'Cappuccino', emoji: '☁️' },
        { value: 'latte', label: 'Latte', emoji: '🥛' },
        { value: 'flatwhite', label: 'Flat White', emoji: '⚪' },
        { value: 'filtercoffee', label: 'Prekvapkávaná', emoji: '📌' },
      ],
    },
    {
      id: 'brewing',
      title: '⚙️ Ako pripravuješ kávu?',
      subtitle: 'Aké metódy používaš alebo by si chcel skúsiť',
      type: 'multiple',
      section: 'intermediate',
      options: [
        { value: 'espresso_machine', label: 'Kávovar', emoji: '🔧' },
        { value: 'french_press', label: 'French Press', emoji: '🍺' },
        { value: 'moka', label: 'Moka kanvička', emoji: '🫖' },
        { value: 'v60', label: 'V60/Chemex', emoji: '📻' },
        { value: 'aeropress', label: 'Aeropress', emoji: '💉' },
        { value: 'instant', label: 'Instantná', emoji: '⚡' },
      ],
    },
    {
      id: 'grind',
      title: '⚙️ Aká hrúbka mletia ti vyhovuje?',
      subtitle: 'Pre tvoju preferovanú metódu',
      type: 'single',
      section: 'expert',
      options: [
        {
          value: 'coarse',
          label: 'Hrubé',
          emoji: '🪨',
          description: 'Pre French Press'
        },
        {
          value: 'medium',
          label: 'Stredné',
          emoji: '🎯',
          description: 'Pre prekvapkávanú'
        },
        {
          value: 'fine',
          label: 'Jemné',
          emoji: '✨',
          description: 'Pre espresso'
        },
      ],
    },
    {
      id: 'flavors',
      title: '🎨 Aké chutové profily vyhľadávaš?',
      subtitle: 'Pomôže nám odporučiť správne odrody',
      type: 'multiple',
      section: 'expert',
      options: [
        { value: 'chocolate', label: 'Čokoládové', emoji: '🫘' },
        { value: 'fruity', label: 'Ovocné', emoji: '🍓' },
        { value: 'nutty', label: 'Oriešky', emoji: '🥜' },
        { value: 'floral', label: 'Kvetinové', emoji: '🌸' },
        { value: 'caramel', label: 'Karamelové', emoji: '🍮' },
        { value: 'spicy', label: 'Korenisté', emoji: '🌶️' },
        { value: 'wine', label: 'Vínové', emoji: '🍷' },
        { value: 'citrus', label: 'Citrusové', emoji: '🍋' },
      ],
    },
    {
      id: 'acidity',
      title: '🍋 Aká kyslosť ti vyhovuje?',
      subtitle: 'Prirodzená vlastnosť kávy',
      type: 'single',
      section: 'expert',
      options: [
        { value: 'low', label: 'Nízka', description: 'Hladká, jemná' },
        { value: 'medium', label: 'Stredná', description: 'Vyvážená' },
        { value: 'high', label: 'Vysoká', description: 'Jasná, ovocná' },
      ],
    },
    {
      id: 'body',
      title: '💫 Aké telo kávy preferuješ?',
      subtitle: 'Pocit v ústach',
      type: 'single',
      section: 'expert',
      options: [
        { value: 'light', label: 'Ľahké', description: 'Ako čaj' },
        { value: 'medium', label: 'Stredné', description: 'Vyvážené' },
        { value: 'full', label: 'Plné', description: 'Krémové, husté' },
      ],
    },
  ];

  /**
   * Vráti zoznam otázok zodpovedajúcich aktuálnej úrovni skúseností.
   */
  const getVisibleQuestions = () => {
    let visibleQuestions = allQuestions.filter(q => q.section === 'basic');

    if (experienceLevel === 'intermediate' || experienceLevel === 'expert') {
      visibleQuestions = [...visibleQuestions, ...allQuestions.filter(q => q.section === 'intermediate')];
    }

    if (experienceLevel === 'expert') {
      visibleQuestions = [...visibleQuestions, ...allQuestions.filter(q => q.section === 'expert')];
    }

    return visibleQuestions;
  };

  const visibleQuestions = getVisibleQuestions();

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
      const res = await loggedFetch('http://10.0.2.2:3001/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        console.log('📥 [BE] Loaded preferences:', data);
        if (data.coffee_preferences) {
          const prefs = data.coffee_preferences;
          setIntensity(prefs.intensity || 'medium');
          setSweetness(prefs.sweetness || 'little');
          setMilk(prefs.milk || false);
          setTemperature(prefs.temperature || 'hot');
          setRoast(prefs.roast || 'medium');
          setPreferredDrinks(prefs.preferred_drinks || []);
          setBrewMethod(prefs.brew_method || []);
          setGrind(prefs.grind || 'medium');
          setFlavorNotes(prefs.flavor_notes || []);
          setAcidity(prefs.acidity || 'medium');
          setBody(prefs.body || 'medium');
        }
        if (data.experience_level) {
          setExperienceLevel(data.experience_level);
        }
      }
    } catch (err) {
      console.warn('Failed to load preferences:', err);
    }
  };

  /**
   * Spracuje odpoveď používateľa pre danú otázku.
   */
  const handleAnswer = (questionId: string, value: any) => {
    switch (questionId) {
      case 'experience':
        setExperienceLevel(value);
        break;
      case 'intensity':
        setIntensity(value);
        break;
      case 'sweetness':
        setSweetness(value);
        break;
      case 'milk':
        setMilk(value);
        break;
      case 'temperature':
        setTemperature(value);
        break;
      case 'roast':
        setRoast(value);
        break;
      case 'drinks':
        toggleArrayValue(value, preferredDrinks, setPreferredDrinks);
        break;
      case 'brewing':
        toggleArrayValue(value, brewMethod, setBrewMethod);
        break;
      case 'grind':
        setGrind(value);
        break;
      case 'flavors':
        toggleArrayValue(value, flavorNotes, setFlavorNotes);
        break;
      case 'acidity':
        setAcidity(value);
        break;
      case 'body':
        setBody(value);
        break;
    }
  };

  /**
   * Pridá alebo odstráni hodnotu z poľa možností.
   */
  const toggleArrayValue = (value: string, array: string[], setter: (v: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(v => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  /**
   * Získa aktuálnu hodnotu pre danú otázku.
   */
  const getValue = (questionId: string) => {
    switch (questionId) {
      case 'experience': return experienceLevel;
      case 'intensity': return intensity;
      case 'sweetness': return sweetness;
      case 'milk': return milk;
      case 'temperature': return temperature;
      case 'roast': return roast;
      case 'drinks': return preferredDrinks;
      case 'brewing': return brewMethod;
      case 'grind': return grind;
      case 'flavors': return flavorNotes;
      case 'acidity': return acidity;
      case 'body': return body;
      default: return null;
    }
  };

  /**
   * Zavolá OpenAI a vygeneruje odporúčanie podľa preferencií.
   */
  const generateAIRecommendation = async (prefs: any, level: string): Promise<string> => {
    if (!OPENAI_API_KEY) {
      console.error('Chýba OpenAI API key. Odporúčanie sa nevygeneruje.');
      return 'Nastala chyba pri generovaní odporúčania.';
    }

    const prompt = `
Ako profesionálny barista vytvor personalizované odporúčanie pre používateľa.
Úroveň skúseností: ${level}

Preferencie používateľa:
${JSON.stringify(prefs, null, 2)}

Vytvor odporúčanie ktoré obsahuje:
1. 🎯 Perfektná káva pre teba
2. ☕ Odporúčané odrody a značky
3. 🔥 Ideálne praženie a príprava
4. 💡 Tip pre lepší zážitok
5. ⚠️ Čomu sa vyhnúť

Píš jednoducho, zrozumiteľne a priateľsky v slovenčine.
    `;

    try {
      console.log('📤 [OpenAI] prefs prompt:', prompt);
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
      console.log('📥 [OpenAI] prefs response:', data);
      return data?.choices?.[0]?.message?.content?.trim() || 'Nepodarilo sa získať odporúčanie.';
    } catch (err) {
      console.error('AI error:', err);
      return 'Nastala chyba pri generovaní odporúčania.';
    }
  };

  /**
   * Uloží vyplnené preferencie a zobrazí odporúčanie.
   */
  const handleSubmit = async () => {
    setIsLoading(true);

    const preferences: any = {
      intensity,
      sweetness,
      sugar: sweetness,
      milk,
      temperature,
    };

    if (experienceLevel !== 'beginner') {
      preferences.roast = roast;
      preferences.preferred_drinks = preferredDrinks;
      preferences.brew_method = brewMethod;
    }

    if (experienceLevel === 'expert') {
      preferences.grind = grind;
      preferences.flavor_notes = flavorNotes;
      preferences.acidity = acidity;
      preferences.body = body;
    }

    try {
      const user = auth().currentUser;
      const token = await user?.getIdToken();

      const aiRecommendation = await generateAIRecommendation(preferences, experienceLevel);

      const res = await loggedFetch('http://10.0.2.2:3001/api/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coffee_preferences: preferences,
          experience_level: experienceLevel,
          ai_recommendation: aiRecommendation,
        }),
      });
      const resData = await res.json().catch(() => null);
      console.log('📥 [BE] Save response:', resData);
      if (!res.ok) throw new Error('Failed to save preferences');
      setRecommendation(aiRecommendation);
      setShowRecommendation(true);
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
            {question.type === 'switch' ? (
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Nie</Text>
                  <Switch
                      value={currentValue as boolean}
                      onValueChange={(value) => handleAnswer(question.id, value)}
                      trackColor={{ false: '#767577', true: colors.primary }}
                      thumbColor={currentValue ? colors.primaryLight : '#f4f3f4'}
                  />
                  <Text style={styles.switchLabel}>Áno</Text>
                </View>
            ) : (
                question.options?.map((option) => {
                  const isSelected = question.type === 'multiple'
                      ? (currentValue as string[])?.includes(option.value)
                      : currentValue === option.value;

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
                        {option.emoji && (
                            <Text style={styles.optionEmoji}>{option.emoji}</Text>
                        )}
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
                        {isSelected && (
                            <Text style={styles.checkmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                  );
                })
            )}
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
          <Text style={styles.headerTitle}>Kávový profil</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
    optionEmoji: {
      fontSize: 24,
      marginRight: 12,
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
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      paddingVertical: 15,
    },
    switchLabel: {
      fontSize: 16,
      color: colors.text,
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
      height: BOTTOM_NAV_HEIGHT,
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
