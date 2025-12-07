import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env';

const trimmedSupabaseUrl = SUPABASE_URL?.trim();
const trimmedSupabaseAnonKey = SUPABASE_ANON_KEY?.trim();

const hasWritableUrlProtocol = (): boolean => {
  if (typeof URL === 'undefined') {
    console.error(
      'Supabase configuration error: URL global is missing. Add react-native-url-polyfill/auto before initializing Supabase.',
    );
    return false;
  }

  const descriptor = Object.getOwnPropertyDescriptor(URL.prototype, 'protocol');

  if (descriptor?.set) {
    return true;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { URL: NodeUrl } = require('url');

    if (NodeUrl && Object.getOwnPropertyDescriptor(NodeUrl.prototype, 'protocol')?.set) {
      globalThis.URL = NodeUrl;
      return true;
    }
  } catch (error) {
    console.error('Supabase configuration error: failed to install URL polyfill.', error);
  }

  console.error(
    'Supabase configuration error: URL polyfill is missing a protocol setter. Add react-native-url-polyfill/auto before initializing Supabase.',
  );
  return false;
};

const isSupabaseConfigValid = (): boolean => {
  if (!trimmedSupabaseUrl) {
    console.error('Supabase configuration error: SUPABASE_URL is missing.');
    return false;
  }

  if (/\s/.test(trimmedSupabaseUrl)) {
    console.error(
      'Supabase configuration error: SUPABASE_URL must not contain whitespace.'
    );
    return false;
  }

  try {
    const parsedUrl = new URL(trimmedSupabaseUrl);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      console.error(
        'Supabase configuration error: SUPABASE_URL must use http or https scheme.'
      );
      return false;
    }
  } catch (error) {
    console.error('Supabase configuration error: SUPABASE_URL is not a valid URL.');
    return false;
  }

  if (!trimmedSupabaseAnonKey) {
    console.error('Supabase configuration error: SUPABASE_ANON_KEY is missing.');
    return false;
  }

  if (/\s/.test(trimmedSupabaseAnonKey)) {
    console.error(
      'Supabase configuration error: SUPABASE_ANON_KEY must not contain whitespace.'
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
export const supabaseClient: SupabaseClient | null = isSupabaseConfigValid() && hasWritableUrlProtocol()
  ? (() => {
      try {
        return createClient(trimmedSupabaseUrl!, trimmedSupabaseAnonKey!);
      } catch (error) {
        console.error(
          'Supabase configuration error: SUPABASE_URL or SUPABASE_ANON_KEY has an invalid format (e.g., contains whitespace, uses a non-http/https scheme, or is empty).',
          error
        );
        return null;
      }
    })()
  : null;
