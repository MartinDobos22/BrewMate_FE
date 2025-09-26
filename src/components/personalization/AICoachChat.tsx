import React, { useCallback, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MoodSignal } from '../../types/PersonalizationAI';

interface Message {
  id: string;
  from: 'user' | 'ai';
  text: string;
  createdAt: string;
}

interface AICoachChatProps {
  onSend: (message: string) => Promise<string>;
  moodSignals?: MoodSignal[];
}

export const AICoachChat: React.FC<AICoachChatProps> = ({ onSend, moodSignals }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) {
      return;
    }
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      from: 'user',
      text: input,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);
    try {
      const response = await onSend(userMessage.text);
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        from: 'ai',
        text: response,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, onSend]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.from === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.moodRow}>
        {moodSignals?.map((signal) => (
          <View key={signal.timestamp} style={styles.moodChip}>
            <Text style={styles.moodText}>{signal.value}</Text>
          </View>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Spýtaj sa na personalizované tipy..."
          multiline
        />
        <Pressable style={[styles.sendButton, isSending && styles.sendButtonDisabled]} onPress={handleSend}>
          <Text style={styles.sendButtonText}>{isSending ? '...' : 'Poslať'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  listContent: {
    padding: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '80%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6F4E37',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEE1D5',
  },
  messageText: {
    color: '#1F1300',
  },
  moodRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  moodChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F0E7DD',
  },
  moodText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D3C5B8',
    padding: 12,
    backgroundColor: '#fff',
  },
  sendButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#6F4E37',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default AICoachChat;
