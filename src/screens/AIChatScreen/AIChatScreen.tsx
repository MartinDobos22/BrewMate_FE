import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import BottomNav, {
  BOTTOM_NAV_CONTENT_OFFSET,
} from '../../components/navigation/BottomNav';
import { useTheme } from '../../theme/ThemeProvider';
import { CONFIG } from '../../config/config';
import { BrewDevice, BREW_DEVICES } from '../../types/Recipe';
import { AIFallback } from '../../offline/AIFallback';
import { createStyles } from './styles';
import LinearGradient from 'react-native-linear-gradient';

interface AIChatScreenProps {
  onBack: () => void;
  onHomePress: () => void;
  onDiscoverPress: () => void;
  onRecipesPress: () => void;
  onFavoritesPress: () => void;
  onProfilePress: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  offline?: boolean;
}

interface RecipeSection {
  type: 'intro' | 'ingredients' | 'steps' | 'tips';
  content: string[];
}

// Helper function to parse recipe from AI response
const parseRecipe = (text: string): RecipeSection[] | null => {
  const sections: RecipeSection[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let currentSection: RecipeSection | null = null;
  let hasRecipeStructure = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Detect section headers
    if (lowerLine.includes('ingredien') || lowerLine.includes('potrebuješ') || lowerLine.includes('potrebuj')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'ingredients', content: [] };
      hasRecipeStructure = true;
      continue;
    }

    if (lowerLine.includes('postup') || lowerLine.includes('kroky') || lowerLine.match(/^\d+\./)) {
      if (currentSection && currentSection.type !== 'steps') {
        sections.push(currentSection);
        currentSection = { type: 'steps', content: [] };
      } else if (!currentSection) {
        currentSection = { type: 'steps', content: [] };
      }
      hasRecipeStructure = true;
    }

    if (lowerLine.includes('tip') || lowerLine.includes('poznámk') || lowerLine.includes('rady')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'tips', content: [] };
      hasRecipeStructure = true;
      continue;
    }

    // Add content to current section
    if (currentSection) {
      if (line.match(/^[\d\-\*•]/)) {
        currentSection.content.push(line);
      } else if (line.length > 3 && !line.endsWith(':')) {
        currentSection.content.push(line);
      }
    } else if (!currentSection && lines.indexOf(line) < 3) {
      // First few lines might be intro
      if (!sections.find(s => s.type === 'intro')) {
        sections.push({ type: 'intro', content: [line] });
      } else {
        sections.find(s => s.type === 'intro')?.content.push(line);
      }
    }
  }

  if (currentSection) sections.push(currentSection);

  return hasRecipeStructure && sections.length > 0 ? sections : null;
};

const AIChatScreen: React.FC<AIChatScreenProps> = ({
  onBack,
  onHomePress,
  onDiscoverPress,
  onRecipesPress,
  onFavoritesPress,
  onProfilePress,
}) => {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [brewDevice, setBrewDevice] = useState<BrewDevice>(BREW_DEVICES[0]);

  const sendMessage = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    const userMessage: Message = { role: 'user', content: trimmedInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    const onlineFetcher = async (question: string) => {
      setLoading(true);
      try {
        const conversation = [
          ...newMessages.slice(0, -1),
          { role: 'user', content: question },
        ];
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CONFIG.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: `Si priateľský odborník na kávu. Zisťuj preferencie používateľa a odporúčaj kávu, mlynčeky a kávovary. Generuj recept pre zariadenie ${brewDevice}.`,
              },
              ...conversation.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.4,
            brewDevice,
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const reply = data?.choices?.[0]?.message?.content?.trim();

        if (!reply) {
          throw new Error('Empty response from AI');
        }

        return reply;
      } finally {
        setLoading(false);
      }
    };

    try {
      const { answer, offline } = await AIFallback.getAnswer(trimmedInput, onlineFetcher);
      if (answer) {
        setMessages((msgs) => [
          ...msgs,
          {
            role: 'assistant',
            content: answer,
            offline,
          },
        ]);
      }
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: 'Nastala chyba pri komunikácii s AI.' },
      ]);
      setLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI odporúčania</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.devicePickerContainer}>
        <Text style={styles.devicePickerLabel}>⚙️ Zariadenie:</Text>
        <Picker
          selectedValue={brewDevice}
          onValueChange={(v) => setBrewDevice(v as BrewDevice)}
          style={styles.devicePicker}
        >
          {BREW_DEVICES.map((d) => (
            <Picker.Item key={d} label={d} value={d} />
          ))}
        </Picker>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: BOTTOM_NAV_CONTENT_OFFSET + 8,
        }}
        showsVerticalScrollIndicator={true}
        style={styles.messagesContainer}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>☕</Text>
            <Text style={styles.emptyStateText}>Opýtaj sa ma čokoľvek o káve!</Text>
            <Text style={styles.emptyStateSubtext}>Poradím ti s receptami, technikami a výberom zariadení</Text>
          </View>
        )}
        {messages.map((msg, idx) => {
          const recipeSections = msg.role === 'assistant' ? parseRecipe(msg.content) : null;
          const isRecipe = recipeSections !== null;

          return (
            <View key={idx}>
              {msg.role === 'user' ? (
                <View style={[styles.message, styles.userMessage]}>
                  <Text style={[styles.messageText, styles.userText]}>
                    {msg.content}
                  </Text>
                </View>
              ) : isRecipe ? (
                <View style={styles.recipeContainer}>
                  <LinearGradient
                    colors={['#FFF9F5', '#FFEFE5']}
                    style={styles.recipeCard}
                  >
                    <View style={styles.recipeHeader}>
                      <Text style={styles.recipeHeaderIcon}>☕</Text>
                      <Text style={styles.recipeHeaderText}>Tvoj recept</Text>
                    </View>

                    {recipeSections.map((section, sIdx) => (
                      <View key={sIdx} style={styles.recipeSection}>
                        {section.type === 'intro' && (
                          <View style={styles.introSection}>
                            {section.content.map((line, lIdx) => (
                              <Text key={lIdx} style={styles.introText}>
                                {line}
                              </Text>
                            ))}
                          </View>
                        )}

                        {section.type === 'ingredients' && (
                          <View>
                            <View style={styles.sectionHeader}>
                              <Text style={styles.sectionIcon}>🧺</Text>
                              <Text style={styles.sectionTitle}>Ingrediencie</Text>
                            </View>
                            <View style={styles.ingredientsGrid}>
                              {section.content.map((item, lIdx) => (
                                <View key={lIdx} style={styles.ingredientChip}>
                                  <Text style={styles.ingredientBullet}>•</Text>
                                  <Text style={styles.ingredientText}>
                                    {item.replace(/^[\d\-\*•]\s*/, '')}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        {section.type === 'steps' && (
                          <View>
                            <View style={styles.sectionHeader}>
                              <Text style={styles.sectionIcon}>📋</Text>
                              <Text style={styles.sectionTitle}>Postup prípravy</Text>
                            </View>
                            <View style={styles.stepsContainer}>
                              {section.content.map((step, lIdx) => {
                                const stepNumber = step.match(/^(\d+)\./) ? step.match(/^(\d+)\./)?.[1] : `${lIdx + 1}`;
                                const stepText = step.replace(/^\d+\.\s*/, '').replace(/^[\-\*•]\s*/, '');

                                return (
                                  <View key={lIdx} style={styles.stepCard}>
                                    <View style={styles.stepNumber}>
                                      <Text style={styles.stepNumberText}>{stepNumber}</Text>
                                    </View>
                                    <Text style={styles.stepText}>{stepText}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                        )}

                        {section.type === 'tips' && (
                          <View>
                            <View style={styles.sectionHeader}>
                              <Text style={styles.sectionIcon}>💡</Text>
                              <Text style={styles.sectionTitle}>Tipy & Poznámky</Text>
                            </View>
                            <View style={styles.tipsContainer}>
                              {section.content.map((tip, lIdx) => (
                                <View key={lIdx} style={styles.tipItem}>
                                  <Text style={styles.tipText}>
                                    {tip.replace(/^[\d\-\*•]\s*/, '')}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    ))}

                    {msg.offline && (
                      <View style={styles.offlineBadge}>
                        <Text style={styles.offlineBadgeText}>📶 Offline odpoveď</Text>
                      </View>
                    )}
                  </LinearGradient>
                </View>
              ) : (
                <View style={[styles.message, styles.aiMessage]}>
                  <Text style={[styles.messageText, styles.aiText]}>
                    {msg.content}
                  </Text>
                  {msg.offline && (
                    <View style={styles.offlineBadge}>
                      <Text style={styles.offlineBadgeText}>📶 Offline odpoveď</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
        {loading && (
          <View style={[styles.message, styles.aiMessage]}>
            <Text style={styles.messageText}>💭 Premýšľam...</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Napíš otázku o káve..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={loading}
          style={styles.sendButton}
        >
          <Text style={styles.sendText}>{loading ? '...' : 'Poslať'}</Text>
        </TouchableOpacity>
      </View>
      <BottomNav
        active="discover"
        onHomePress={onHomePress}
        onDiscoverPress={onDiscoverPress}
        onRecipesPress={onRecipesPress}
        onFavoritesPress={onFavoritesPress}
        onProfilePress={onProfilePress}
      />
    </View>
  );
};

export default AIChatScreen;
