jest.mock('@supabase/supabase-js', () => {
  const createClient = jest.fn();

  return {
    __esModule: true,
    createClient,
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
  },
}));

import { createClient } from '@supabase/supabase-js';

describe('supabaseClient configuration', () => {
  const originalEnv = process.env;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (createClient as jest.Mock).mockReset();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
    console.error = originalError;
    console.warn = originalWarn;
  });

  const loadSupabaseClient = () => require('../supabaseClient').supabaseClient;

  it('trims environment inputs before creating the client', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = ' https://example.supabase.co  ';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = '\n anon-key  ';

    const supabaseClient = loadSupabaseClient();

    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({
        accessToken: expect.any(Function),
      })
    );
    expect(console.warn).toHaveBeenCalled();
    expect(supabaseClient).not.toBeNull();
  });

  it('rejects URLs that do not match the strict http/https pattern', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'ftp://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const supabaseClient = loadSupabaseClient();

    expect(createClient).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      'Supabase configuration error: SUPABASE_URL must start with http:// or https:// and contain no spaces.'
    );
    expect(supabaseClient).toBeNull();
  });

  it('rejects empty values after trimming whitespace', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = '   ';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = '   ';

    const supabaseClient = loadSupabaseClient();

    expect(createClient).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      'Supabase configuration error: SUPABASE_URL is empty after trimming whitespace/newlines. Update your environment file with a non-empty value.'
    );
    expect(console.error).toHaveBeenCalledWith(
      'Supabase configuration error: SUPABASE_ANON_KEY is empty after trimming whitespace/newlines. Update your environment file with a non-empty value.'
    );
    expect(supabaseClient).toBeNull();
  });
});
