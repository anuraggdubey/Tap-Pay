import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Build-time configuration (#27): never committed. Set TAPPAY_SUPABASE_URL and
// TAPPAY_SUPABASE_ANON_KEY in your shell, in CI variables, or in the git-ignored .env file (see
// .env.example). scripts/babel-inline-app-config.js inlines them when the bundle is built, and a
// release build fails if they are missing.
const SUPABASE_URL = process.env.TAPPAY_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.TAPPAY_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.error(
    'Supabase is not configured: set TAPPAY_SUPABASE_URL and TAPPAY_SUPABASE_ANON_KEY at build time (see .env.example). @username features are unavailable.',
  );
}

// createClient throws on an empty URL at import time. An unroutable placeholder keeps the rest of
// the app working and makes every @username request fail cleanly instead.
export const supabase = createClient(
  SUPABASE_URL || 'https://supabase-not-configured.invalid',
  SUPABASE_ANON_KEY || 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
