import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://nmqdajkipbsihuqeyrmm.supabase.co';
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tcWRhamtpcGJzaWh1cWV5cm1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjczMzgsImV4cCI6MjEwNTI0MzMzOH0.YtGdMkWgIwcZ020yncGYJmErys1-coogs2PWSqbEl9o';

export const supabase = createClient(url, anonKey);

export type WaitlistRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  source: string;
};
