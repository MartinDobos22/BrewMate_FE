import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LanguageThemeScreen from './Onboarding/LanguageThemeScreen';
import PermissionsScreen from './Onboarding/PermissionsScreen';
import FeaturesScreen from './Onboarding/FeaturesScreen';

interface Props {
  onFinish: () => void;
}

const Stack = createStackNavigator();

const OnboardingScreen: React.FC<Props> = ({ onFinish }) => {
  const handleFinish = async () => {
    await AsyncStorage.setItem('@OnboardingComplete', 'true');
    onFinish();
  };

  return (
    <NavigationContainer independent>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LanguageTheme" component={LanguageThemeScreen} />
        <Stack.Screen name="Permissions" component={PermissionsScreen} />
        <Stack.Screen name="Features">
          {() => <FeaturesScreen onFinish={handleFinish} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default OnboardingScreen;
