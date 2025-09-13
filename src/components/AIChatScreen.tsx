import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import BottomNav, { BOTTOM_NAV_HEIGHT } from './BottomNav';
import { useTheme } from '../theme/ThemeProvider';
import { CONFIG } from '../config/config';

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

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    try {
      setLoading(true);
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
              content:
                'Si priateľský odborník na kávu. Zisťuj preferencie používateľa a odporúčaj kávu, mlynčeky a kávovary.',
            },
            ...newMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
          temperature: 0.4,
        }),
      });
      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (reply) {
        setMessages((msgs) => [...msgs, { role: 'assistant', content: reply }]);
      }
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        { role: 'assistant', content: 'Nastala chyba pri komunikácii s AI.' },
      ]);
    } finally {
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
  });

export default AIChatScreen;
