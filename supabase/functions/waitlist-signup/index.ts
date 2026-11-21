import {Config, createHandler} from './handler.ts';

function readConfig(): Config | null {
  const origins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean);
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY') || '';
  const ipSalt = Deno.env.get('WAITLIST_IP_SALT') || '';
  const limit = Number(Deno.env.get('WAITLIST_RATE_LIMIT') || '5');
  try {
    if (!origins.length || origins.some(origin => {
      const url = new URL(origin);
      return url.origin !== origin || !['https:', 'http:'].includes(url.protocol);
    }) || !supabaseUrl || !serviceKey || !turnstileSecret || ipSalt.length < 32 ||
        !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      return null;
    }
    if (!['https:', 'http:'].includes(new URL(supabaseUrl).protocol)) {
      return null;
    }
    // Optional confirmation email. All-or-nothing: a half-configured provider fails closed instead
    // of silently storing signups nobody can confirm.
    const apiKey = Deno.env.get('EMAIL_API_KEY') || '';
    const from = Deno.env.get('WAITLIST_FROM_EMAIL') || '';
    const confirmUrl = Deno.env.get('WAITLIST_CONFIRM_URL') || '';
    const apiUrl = Deno.env.get('EMAIL_API_URL') || 'https://api.resend.com/emails';
    let email: Config['email'];
    if (apiKey || from || confirmUrl) {
      if (!apiKey || !from || !confirmUrl || new URL(confirmUrl).protocol !== 'https:' ||
          new URL(apiUrl).protocol !== 'https:') {
        return null;
      }
      email = {apiUrl, apiKey, from, confirmUrl};
    }
    return {origins, supabaseUrl: supabaseUrl.replace(/\/$/, ''), serviceKey, turnstileSecret, ipSalt, limit, email};
  } catch {
    return null;
  }
}

Deno.serve(createHandler(readConfig()));
