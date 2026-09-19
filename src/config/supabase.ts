import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nmqdajkipbsihuqeyrmm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tcWRhamtpcGJzaWh1cWV5cm1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjczMzgsImV4cCI6MjEwNTI0MzMzOH0.YtGdMkWgIwcZ020yncGYJmErys1-coogs2PWSqbEl9o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
