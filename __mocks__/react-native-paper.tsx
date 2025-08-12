import React from 'react';
import { View } from 'react-native';

interface FABProps {
  icon: string;
  onPress?: () => void;
  style?: any;
  color?: string;
}

export const FAB: React.FC<FABProps> = () => <View />;

export default { FAB };
