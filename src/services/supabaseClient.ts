import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env';

const isSupabaseConfigValid = (): boolean => {
  if (!SUPABASE_URL) {
    console.error('Supabase configuration error: SUPABASE_URL is missing.');
    return false;
  }

  try {
    const parsedUrl = new URL(SUPABASE_URL);

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

  if (!SUPABASE_ANON_KEY) {
    console.error('Supabase configuration error: SUPABASE_ANON_KEY is missing.');
    return false;
  }

  if (typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.trim().length === 0) {
    console.error('Supabase configuration error: SUPABASE_ANON_KEY cannot be empty.');
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
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!)
  : null;
