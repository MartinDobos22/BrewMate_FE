import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import BottomNav, { BOTTOM_NAV_HEIGHT } from './BottomNav';
import { useTheme } from '../theme/ThemeProvider';
import { CONFIG } from '../config/config';
import { BrewDevice, BREW_DEVICES } from '../types/Recipe';
import { AIFallback } from '../offline/AIFallback';

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
      <Picker
        selectedValue={brewDevice}
        onValueChange={(v) => setBrewDevice(v as BrewDevice)}
        style={styles.devicePicker}
      >
        {BREW_DEVICES.map((d) => (
          <Picker.Item key={d} label={d} value={d} />
        ))}
      </Picker>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: BOTTOM_NAV_HEIGHT }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={[
              styles.message,
              msg.role === 'user' ? styles.userMessage : styles.aiMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                msg.role === 'user' ? styles.userText : styles.aiText,
              ]}
            >
              {msg.content}
            </Text>
            {msg.role === 'assistant' && msg.offline && (
              <View style={styles.offlineBadge}>
                <Text style={styles.offlineBadgeText}>Offline odpoveď</Text>
              </View>
            )}
          </View>
        ))}
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

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.primary,
    },
    backButton: {
      padding: 4,
    },
    backText: {
      color: 'white',
      fontSize: 18,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
    },
    message: {
      marginBottom: 12,
      padding: 10,
      borderRadius: 8,
      maxWidth: '80%',
    },
    userMessage: {
      alignSelf: 'flex-end',
      backgroundColor: colors.primary,
    },
    aiMessage: {
      alignSelf: 'flex-start',
      backgroundColor: '#e0e0e0',
    },
    messageText: {
      fontSize: 16,
    },
    userText: {
      color: 'white',
    },
    aiText: {
      color: '#000',
    },
    inputRow: {
      flexDirection: 'row',
      padding: 16,
      borderTopWidth: 1,
      borderColor: '#ccc',
      backgroundColor: colors.background,
    },
    devicePicker: {
      marginHorizontal: 16,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    sendButton: {
      marginLeft: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      justifyContent: 'center',
      borderRadius: 8,
      opacity: 1,
    },
    sendText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    offlineBadge: {
      marginTop: 6,
      alignSelf: 'flex-start',
      backgroundColor: '#f9d67a',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    offlineBadgeText: {
      fontSize: 12,
      color: '#4a3b0b',
      fontWeight: '600',
    },
  });

export default AIChatScreen;
