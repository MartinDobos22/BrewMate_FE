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
  SafeAreaView,
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { getColors, Colors } from '../theme/colors';
import { getSafeAreaTop, getSafeAreaBottom, scale } from './utils/safeArea';

const { width } = Dimensions.get('window');

const EditUserProfile = ({ onBack }: { onBack: () => void }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const colors = getColors(isDarkMode);
  const styles = createStyles(colors);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user = auth().currentUser;
        const token = await user?.getIdToken();
        const res = await fetch('http://10.0.2.2:3001/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Nepodarilo sa načítať profil');
        const data = await res.json();

        setName(data.name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      } catch (err) {
        Alert.alert('Chyba', 'Nepodarilo sa načítať profil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const user = auth().currentUser;
      const token = await user?.getIdToken();

      const res = await fetch('http://10.0.2.2:3001/api/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, bio, avatar_url: avatarUrl }),
      });

      if (!res.ok) throw new Error('Nepodarilo sa uložiť profil');
      Alert.alert('✅ Úspech', 'Profil uložený');
      onBack();
    } catch (err) {
      Alert.alert('Chyba', 'Uloženie zlyhalo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
          <Text style={styles.headerTitle}>Upraviť profil</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onBack}>
          <Text style={styles.headerButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upraviť profil</Text>
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
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>✏️ Upraviť profil</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Meno</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Zadaj meno"
                placeholderTextColor={colors.textSecondary}
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>O mne / Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                style={[styles.input, styles.multiline]}
                multiline
                numberOfLines={4}
                placeholder="Povedz niečo o sebe"
                placeholderTextColor={colors.textSecondary}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Avatar URL</Text>
              <TextInput
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                style={styles.input}
                placeholder="https://example.com/avatar.jpg"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Ukladám...' : '💾 Uložiť'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onBack}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Zrušiť</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    formCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: scale(20),
      padding: scale(20),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    formTitle: {
      fontSize: scale(22),
      fontWeight: 'bold',
      marginBottom: scale(20),
      color: colors.text,
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: scale(16),
    },
    label: {
      fontSize: scale(14),
      fontWeight: '600',
      color: colors.text,
      marginBottom: scale(8),
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: scale(12),
      padding: scale(12),
      backgroundColor: colors.background,
      color: colors.text,
      fontSize: scale(14),
    },
    multiline: {
      height: scale(100),
      textAlignVertical: 'top',
    },
    buttonsContainer: {
      marginTop: scale(20),
      gap: scale(10),
    },
    saveButton: {
      backgroundColor: colors.secondary,
      padding: scale(15),
      borderRadius: scale(20),
      alignItems: 'center',
    },
    disabledButton: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: scale(16),
    },
    cancelButton: {
      backgroundColor: 'transparent',
      padding: scale(15),
      borderRadius: scale(20),
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontSize: scale(14),
      fontWeight: '600',
    },
  });

export default EditUserProfile;