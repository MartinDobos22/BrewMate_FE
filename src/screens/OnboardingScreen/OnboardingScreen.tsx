import React from 'react';
import { View, StyleSheet } from 'react-native';
import PersonalizationOnboarding, {
  type PersonalizationResult,
} from '../../components/personalization/PersonalizationOnboarding';

export interface Props {
  onFinish: (result: PersonalizationResult) => void;
  onSkip?: () => void;
}

const OnboardingScreen: React.FC<Props> = ({ onFinish, onSkip }) => {
  return (
    <View style={styles.container}>
      <PersonalizationOnboarding onComplete={onFinish} onSkip={onSkip ?? (() => {})} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default OnboardingScreen;
