import { Platform } from 'react-native';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log(
  '[ENV_DEBUG]',
  'Platform:',
  Platform.OS,
  'SUPABASE_URL:',
  JSON.stringify(SUPABASE_URL),
  'ANON_KEY set:',
  !!SUPABASE_ANON_KEY
);
