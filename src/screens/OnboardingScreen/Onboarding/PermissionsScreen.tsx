import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Platform } from 'react-native';
import {
  requestMultiple,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from 'react-native-permissions';
import { useTheme } from '../../../../theme/ThemeProvider';

interface Props {
  navigation: any;
}

const PermissionsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const [denied, setDenied] = useState(false);

  const requestPerms = async () => {
    setDenied(false);
    const permissions = Platform.select({
      ios: [PERMISSIONS.IOS.CAMERA, PERMISSIONS.IOS.PHOTO_LIBRARY],
      android: [
        PERMISSIONS.ANDROID.CAMERA,
        Platform.Version >= 33
          ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES
          : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
      ],
    }) as string[];

    const statuses = await requestMultiple(permissions);
    const granted = Object.values(statuses).every((s) => s === RESULTS.GRANTED);
    if (granted) {
      navigation.navigate('Features');
    } else {
      const blocked = Object.values(statuses).some((s) => s === RESULTS.BLOCKED);
      if (blocked) {
        await openSettings();
      } else {
        setDenied(true);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Text style={[styles.text, { color: colors.text }]}>Aplikácia potrebuje prístup ku kamere a úložisku.</Text>
      {denied && (
        <Text style={[styles.warning, { color: colors.danger }]}>Povolenia boli odmietnuté.</Text>
      )}
      <Button title={denied ? 'Skúsiť znova' : 'Udelit povolenia'} onPress={requestPerms} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    textAlign: 'center',
    marginBottom: 20,
  },
  warning: {
    marginBottom: 20,
  },
});

export default PermissionsScreen;
