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
 * Hosts the personalization onboarding flow and passes navigation callbacks to
 * the underlying component.
 *
 * @param onFinish - Callback invoked with personalization outcomes when the
 *   onboarding flow completes.
 * @param onSkip - Optional handler when the user opts out of onboarding; falls
 *   back to a no-op to avoid conditional rendering.
 * @returns Wrapped onboarding UI.
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
