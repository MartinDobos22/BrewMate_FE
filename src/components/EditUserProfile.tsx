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
  } from 'react-native';
  import auth from '@react-native-firebase/auth';
  import { getColors, Colors } from '../theme/colors';

  const EditUserProfile = ({ onBack }: { onBack: () => void }) => {
    const isDarkMode = useColorScheme() === 'dark';
    const colors = getColors(isDarkMode);
    const styles = createStyles(colors);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);

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
    }
  };

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>✏️ Upraviť profil</Text>

      <Text style={styles.label}>Meno</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Zadaj meno" />

      <Text style={styles.label}>O mne / Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        style={[styles.input, styles.multiline]}
        multiline
        numberOfLines={4}
        placeholder="Povedz niečo o sebe"
      />

      <Text style={styles.label}>Avatar URL</Text>
      <TextInput
        value={avatarUrl}
        onChangeText={setAvatarUrl}
        style={styles.input}
        placeholder="https://example.com/avatar.jpg"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>💾 Uložiť</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Späť</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

  const createStyles = (colors: Colors) =>
    StyleSheet.create({
      container: {
        padding: 30,
        backgroundColor: colors.background,
      },
      title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 20,
        color: colors.text,
      },
      label: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 10,
        color: colors.text,
      },
      input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 10,
        marginTop: 5,
        backgroundColor: colors.cardBackground,
        color: colors.text,
      },
      multiline: {
        height: 100,
        textAlignVertical: 'top',
      },
      saveButton: {
        backgroundColor: colors.secondary,
        padding: 15,
        borderRadius: 20,
        marginTop: 30,
        alignItems: 'center',
      },
      saveButtonText: { color: '#fff', fontWeight: 'bold' },
      backButton: {
        marginTop: 20,
        alignItems: 'center',
      },
      backButtonText: {
        color: colors.primary,
        fontSize: 16,
      },
    });

export default EditUserProfile;
