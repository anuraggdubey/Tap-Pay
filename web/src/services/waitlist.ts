import { supabase } from '../lib/supabase';

export type JoinWaitlistResult =
  | { ok: true }
  | { ok: false; error: 'invalid' | 'duplicate' | 'network' | 'unknown'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(name: string, email: string): Promise<JoinWaitlistResult> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedName.length < 2) {
    return { ok: false, error: 'invalid', message: 'Please enter your name.' };
  }
  if (!EMAIL_RE.test(trimmedEmail)) {
    return { ok: false, error: 'invalid', message: 'Please enter a valid email address.' };
  }

  const { error } = await supabase.from('waitlist').insert([
    {
      name: trimmedName,
      email: trimmedEmail,
      source: 'web',
    },
  ]);

  if (error) {
    if (error.code === '23505') {
      return {
        ok: false,
        error: 'duplicate',
        message: 'This email is already on the waitlist. We’ll notify you at launch.',
      };
    }
    if (error.message?.includes('waitlist') && error.code === '42P01') {
      return {
        ok: false,
        error: 'unknown',
        message: 'Waitlist is not configured yet. Please try again shortly.',
      };
    }
    return { ok: false, error: 'network', message: error.message || 'Something went wrong. Try again.' };
  }

  try {
    localStorage.setItem('tappay_waitlist_joined', '1');
  } catch {
    /* ignore */
  }

  return { ok: true };
}
