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
  useColorScheme,
  SafeAreaView,
  Animated,
  } from 'react-native';
  import auth from '@react-native-firebase/auth';
  import { getColors } from '../theme/colors';

const OPENAI_API_KEY = "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";

interface Question {
  id: string;
  title: string;
  subtitle: string;
  type: 'single' | 'multiple' | 'switch';
  options?: { value: string; label: string; emoji?: string; description?: string }[];
}

const CoffeePreferenceForm = ({ onBack }: { onBack: () => void }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const slideAnim = useState(new Animated.Value(0))[0];

  const colors = getColors(isDarkMode);
  const styles = createStyles(isDarkMode);

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

  // Definícia otázok podľa úrovne
  const getQuestions = (): Question[] => {
    const baseQuestions: Question[] = [
      {
        id: 'experience',
        title: '👋 Aká je tvoja skúsenosť s kávou?',
        subtitle: 'Pomôže nám to prispôsobiť otázky',
        type: 'single',
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
        options: [
          { value: 'none', label: 'Bez sladkosti', emoji: '🚫' },
          { value: 'little', label: 'Mierne sladká', emoji: '🤏' },
          { value: 'medium', label: 'Stredne sladká', emoji: '👌' },
          { value: 'sweet', label: 'Sladká', emoji: '🍬' },
        ],
      },
      {
        id: 'milk',
        title: '🥛 Piješ kávu s mliekom?',
        subtitle: 'Mlieko zjemňuje chuť a znižuje horkosť',
        type: 'switch',
      },
      {
        id: 'temperature',
        title: '🌡️ Aká teplota kávy ti vyhovuje?',
        subtitle: 'Teplota ovplyvňuje chuť',
        type: 'single',
        options: [
          { value: 'hot', label: 'Horúca', emoji: '🔥' },
          { value: 'iced', label: 'Ľadová', emoji: '🧊' },
          { value: 'both', label: 'Oboje', emoji: '🔄' },
        ],
      },
    ];

    const intermediateQuestions: Question[] = [
      {
        id: 'roast',
        title: '🔥 Aké praženie preferuješ?',
        subtitle: 'Ovplyvňuje chuť a arómu',
        type: 'single',
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
        options: [
          { value: 'espresso', label: 'Espresso', emoji: '🔵' },
          { value: 'americano', label: 'Americano', emoji: '💧' },
          { value: 'cappuccino', label: 'Cappuccino', emoji: '☁️' },
          { value: 'latte', label: 'Latte', emoji: '🥛' },
          { value: 'flatwhite', label: 'Flat White', emoji: '⚪' },
          { value: 'filtercoffee', label: 'Prekvapkávaná', emoji: '📍' },
        ],
      },
      {
        id: 'brewing',
        title: '⚙️ Ako pripravuješ kávu?',
        subtitle: 'Aké metódy používaš alebo by si chcel skúsiť',
        type: 'multiple',
        options: [
          { value: 'espresso_machine', label: 'Kávovar', emoji: '🔧' },
          { value: 'french_press', label: 'French Press', emoji: '🏺' },
          { value: 'moka', label: 'Moka kanvička', emoji: '🫖' },
          { value: 'v60', label: 'V60/Chemex', emoji: '🔻' },
          { value: 'aeropress', label: 'Aeropress', emoji: '💉' },
          { value: 'instant', label: 'Instantná', emoji: '⚡' },
        ],
      },
    ];

    const expertQuestions: Question[] = [
      {
        id: 'grind',
        title: '⚙️ Aká hrúbka mletia ti vyhovuje?',
        subtitle: 'Pre tvoju preferovanú metódu',
        type: 'single',
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
        options: [
          { value: 'chocolate', label: 'Čokoládové', emoji: '🍫' },
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
        options: [
          { value: 'light', label: 'Ľahké', description: 'Ako čaj' },
          { value: 'medium', label: 'Stredné', description: 'Vyvážené' },
          { value: 'full', label: 'Plné', description: 'Krémové, husté' },
        ],
      },
    ];

    // Zostavenie otázok podľa úrovne
    let questions = [...baseQuestions];

    if (experienceLevel === 'intermediate' || experienceLevel === 'expert') {
      questions = [...questions, ...intermediateQuestions];
    }

    if (experienceLevel === 'expert') {
      questions = [...questions, ...expertQuestions];
    }

    return questions;
  };

  const questions = getQuestions();
  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    // Animácia pri zmene kroku
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentStep, slideAnim]);

  const loadPreferences = async () => {
    try {
      const user = auth().currentUser;
      const token = await user?.getIdToken();
      const res = await fetch('http://10.0.2.2:3001/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
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

  const handleAnswer = (value: any) => {
    const q = currentQuestion;

    switch (q.id) {
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
        return; // Don't auto-advance for multiple choice
      case 'brewing':
        toggleArrayValue(value, brewMethod, setBrewMethod);
        return;
      case 'grind':
        setGrind(value);
        break;
      case 'flavors':
        toggleArrayValue(value, flavorNotes, setFlavorNotes);
        return;
      case 'acidity':
        setAcidity(value);
        break;
      case 'body':
        setBody(value);
        break;
    }

    // Auto pokračovanie pre single choice
    if (q.type === 'single' || q.type === 'switch') {
      handleNext();
    }
  };

  const toggleArrayValue = (value: string, array: string[], setter: (v: string[]) => void) => {
    if (array.includes(value)) {
      setter(array.filter(v => v !== value));
    } else {
      setter([...array, value]);
    }
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      slideAnim.setValue(0);
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      slideAnim.setValue(0);
      setCurrentStep(currentStep - 1);
    }
  };

  const generateAIRecommendation = async (prefs: any, level: string): Promise<string> => {
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

  const handleSubmit = async () => {
    setIsLoading(true);

    const preferences: any = {
      intensity,
      sweetness,
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

      const res = await fetch('http://10.0.2.2:3001/api/profile', {
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

      if (!res.ok) throw new Error('Failed to save preferences');

      Alert.alert(
        '✅ Hotovo!',
        'Tvoj kávový profil bol uložený. Teraz ti vieme odporučiť perfektnú kávu!',
        [{ text: 'Skvelé', onPress: onBack }]
      );
    } catch (err) {
      Alert.alert('Chyba', 'Nepodarilo sa uložiť preferencie');
    } finally {
      setIsLoading(false);
    }
  };

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

  const canProceed = () => {
    const value = getValue(currentQuestion.id);
    if (currentQuestion.type === 'multiple') {
      return Array.isArray(value) && value.length > 0;
    }
    return value !== null && value !== undefined;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kávový profil</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: `${progress}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Otázka {currentStep + 1} z {questions.length}
        </Text>
      </View>

      {/* Question */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.questionContainer,
            {
              opacity: slideAnim,
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
          <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {currentQuestion.type === 'switch' ? (
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Nie</Text>
                <Switch
                  value={getValue(currentQuestion.id) as boolean}
                  onValueChange={(value) => handleAnswer(value)}
                  trackColor={{ false: '#767577', true: colors.primary }}
                  thumbColor={getValue(currentQuestion.id) ? colors.primaryLight : '#f4f3f4'}
                />
                <Text style={styles.switchLabel}>Áno</Text>
              </View>
            ) : (
              currentQuestion.options?.map((option) => {
                const currentValue = getValue(currentQuestion.id);
                const isSelected = currentQuestion.type === 'multiple'
                  ? (currentValue as string[])?.includes(option.value)
                  : currentValue === option.value;

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected
                    ]}
                    onPress={() => handleAnswer(option.value)}
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
        </Animated.View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, styles.navButtonSecondary]}
          onPress={handlePrevious}
          disabled={currentStep === 0}
        >
          <Text style={styles.navButtonTextSecondary}>
            {currentStep === 0 ? '' : '← Späť'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonPrimary,
            !canProceed() && styles.navButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!canProceed() || isLoading}
        >
          <Text style={styles.navButtonTextPrimary}>
            {currentStep === questions.length - 1 ? 'Dokončiť ✓' : 'Ďalej →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

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
    progressContainer: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    progressBar: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 8,
      textAlign: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    questionContainer: {
      paddingVertical: 20,
    },
    questionTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    questionSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 30,
    },
    optionsContainer: {
      gap: 12,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: colors.border,
      marginBottom: 12,
    },
    optionCardSelected: {
      borderColor: colors.primary,
      backgroundColor: isDarkMode ? 'rgba(139,69,19,0.2)' : 'rgba(139,69,19,0.1)',
    },
    optionEmoji: {
      fontSize: 28,
      marginRight: 15,
    },
    optionTextContainer: {
      flex: 1,
    },
    optionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    optionLabelSelected: {
      color: colors.primary,
    },
    optionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    optionDescriptionSelected: {
      color: colors.primaryLight,
    },
    checkmark: {
      fontSize: 20,
      color: colors.primary,
      fontWeight: 'bold',
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      paddingVertical: 20,
    },
    switchLabel: {
      fontSize: 18,
      color: colors.text,
    },
    navigation: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 15,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    navButton: {
      flex: 1,
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: 'center',
    },
    navButtonPrimary: {
      backgroundColor: colors.primary,
    },
    navButtonSecondary: {
      backgroundColor: 'transparent',
    },
    navButtonDisabled: {
      opacity: 0.5,
    },
    navButtonTextPrimary: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    navButtonTextSecondary: {
      color: colors.text,
      fontSize: 16,
    },
  });
};

export default CoffeePreferenceForm;