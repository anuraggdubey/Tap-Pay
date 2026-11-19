import { createClient } from '@supabase/supabase-js';

function configuredClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  try {
    return createClient(url, anonKey);
  } catch {
    return null;
  }
}

export const supabase = configuredClient();

export type WaitlistRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  source: string;
};
