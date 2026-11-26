import {verifyMessage} from 'https://esm.sh/ethers@6.17.0';
import {Config, createHandler} from './handler.ts';

function readConfig(): Config | null {
  const origins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(v => v.trim()).filter(Boolean);
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  try {
    if (!supabaseUrl || !serviceKey || !['https:', 'http:'].includes(new URL(supabaseUrl).protocol)) {
      return null;
    }
    return {origins, supabaseUrl, serviceKey};
  } catch {
    return null;
  }
}

const verify = (message: string, signature: string): string | null => {
  try {
    return verifyMessage(message, signature);
  } catch {
    return null;
  }
};

Deno.serve(createHandler(readConfig(), verify));
