import React from 'react';
import { View, StyleSheet } from 'react-native';
import PersonalizationOnboarding, {
  type PersonalizationResult,
} from '../../components/personalization/PersonalizationOnboarding';

/**
 * Props for the onboarding experience wrapper.
 */
export interface Props {
  onFinish: (result: PersonalizationResult) => void;
  onSkip?: () => void;
}

/**
 * Screen wrapper for the personalization onboarding flow that collects user taste preferences.
 *
 * @param {Props} props - Component props.
 * @param {(result: PersonalizationResult) => void} props.onFinish - Callback invoked when onboarding completes with the generated profile.
 * @param {() => void} [props.onSkip] - Optional handler executed when the user opts to skip onboarding.
 * @returns {JSX.Element} The rendered onboarding screen container.
 */
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
