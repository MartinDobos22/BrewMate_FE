import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env';

const SUPABASE_URL_PATTERN = /^https?:\/\/\S+$/;

const normalizeEnvValue = (
  value: string | undefined,
  variableName: 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'
): string | null => {
  if (value == null) {
    console.error(`Supabase configuration error: ${variableName} is missing.`);
    return null;
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    console.error(
      `Supabase configuration error: ${variableName} is empty after trimming whitespace/newlines. Update your environment file with a non-empty value.`
    );
    return null;
  }

  if (normalizedValue !== value) {
    console.warn(
      `Supabase configuration warning: ${variableName} contains surrounding whitespace/newlines and was trimmed. Update your environment file to remove the extra characters.`
    );
  }

  if (/\s/.test(normalizedValue)) {
    console.error(
      `Supabase configuration error: ${variableName} must not include internal whitespace.`
    );
    return null;
  }

  return normalizedValue;
};

const trimmedSupabaseUrl = normalizeEnvValue(SUPABASE_URL, 'SUPABASE_URL');
const trimmedSupabaseAnonKey = normalizeEnvValue(
  SUPABASE_ANON_KEY,
  'SUPABASE_ANON_KEY'
);

const getSupabaseAccessToken = async (): Promise<string | null> => {
  try {
    // Prefer a Supabase-issued JWT if the backend exchanges auth tokens.
    const storedToken = await AsyncStorage.getItem('@SupabaseJwt');
    if (storedToken) {
      return storedToken;
    }

    // Fallback to the Firebase token only when Supabase is configured to trust it.
    return await AsyncStorage.getItem('@AuthToken');
  } catch (error) {
    console.warn('Supabase configuration warning: failed to read auth token.', error);
    return null;
  }
};

const isSupabaseConfigValid = (): boolean => {
  if (!trimmedSupabaseUrl || !trimmedSupabaseAnonKey) {
    return false;
  }

  if (!SUPABASE_URL_PATTERN.test(trimmedSupabaseUrl)) {
    console.error(
      'Supabase configuration error: SUPABASE_URL must start with http:// or https:// and contain no spaces.'
    );
    return false;
  }

  return true;
};

/**
 * Pre-configured Supabase client used across the app for database and auth operations.
 *
 * The client is only instantiated when both the public URL and anon key are available
 * in environment variables; otherwise it remains `null` and callers should guard for
 * missing configuration.
 *
 * @type {SupabaseClient | null}
 */
export const supabaseClient: SupabaseClient | null = isSupabaseConfigValid()
  ? (() => {
      try {
        return createClient(trimmedSupabaseUrl!, trimmedSupabaseAnonKey!, {
          accessToken: async () => (await getSupabaseAccessToken()) ?? undefined,
        });
      } catch (error) {
        console.error(
          'Supabase configuration error: SUPABASE_URL or SUPABASE_ANON_KEY has an invalid format (e.g., contains whitespace, uses a non-http/https scheme, or is empty).',
          error
        );
        return null;
      }
    })()
  : null;
