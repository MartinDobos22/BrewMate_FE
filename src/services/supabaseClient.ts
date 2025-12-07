import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env';

/**
 * Pre-configured Supabase client used across the app for database and auth operations.
 *
 * The client is only instantiated when both the public URL and anon key are available
 * in environment variables; otherwise it remains `null` and callers should guard for
 * missing configuration.
 *
 * @type {SupabaseClient | null}
 */
export const supabaseClient: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
