/**
 * Build-time environment variables consumed by the React Native bundle.
 *
 * The values are inlined by the custom Babel plugin in `scripts/babel-inline-env.js`,
 * which reads from the root `.env` file during bundling.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
