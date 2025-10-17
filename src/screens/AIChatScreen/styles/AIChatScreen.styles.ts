import { StyleSheet } from 'react-native';

export const createStyles = (colors: any) =>
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
