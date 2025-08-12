declare module 'react-native-paper' {
  import * as React from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export interface FABProps {
    icon: string;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
    color?: string;
  }

  export const FAB: React.FC<FABProps>;
}
