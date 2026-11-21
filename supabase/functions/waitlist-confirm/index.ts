import {Config, createHandler} from './handler.ts';

function readConfig(): Config | null {
  const origins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const ipSalt = Deno.env.get('WAITLIST_IP_SALT') || '';
  const limit = Number(Deno.env.get('WAITLIST_CONFIRM_RATE_LIMIT') || '20');
  try {
    if (!origins.length || origins.some(origin => {
      const url = new URL(origin);
      return url.origin !== origin || !['https:', 'http:'].includes(url.protocol);
    }) || !supabaseUrl || !serviceKey || ipSalt.length < 32 ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      return null;
    }
    if (!['https:', 'http:'].includes(new URL(supabaseUrl).protocol)) {
      return null;
    }
    return {origins, supabaseUrl: supabaseUrl.replace(/\/$/, ''), serviceKey, ipSalt, limit};
  } catch {
    return null;
  }
}

Deno.serve(createHandler(readConfig()));
