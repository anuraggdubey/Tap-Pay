import { supabase } from '../lib/supabase';

export type JoinWaitlistResult =
  | { ok: true }
  | { ok: false; error: 'invalid' | 'network'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(name: string, email: string, token: string): Promise<JoinWaitlistResult> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (Array.from(trimmedName).length < 2 || Array.from(trimmedName).length > 100) {
    return { ok: false, error: 'invalid', message: 'Please enter a name between 2 and 100 characters.' };
  }
  if (trimmedEmail.length > 254 || !EMAIL_RE.test(trimmedEmail)) {
    return { ok: false, error: 'invalid', message: 'Please enter a valid email address.' };
  }

  if (!token) {
    return { ok: false, error: 'invalid', message: 'Please complete the verification.' };
  }
  const failure: JoinWaitlistResult = {
    ok: false, error: 'network', message: 'Unable to join the waitlist. Please try again later.',
  };
  if (!supabase) {
    return failure;
  }
  try {
    const {data, error} = await supabase.functions.invoke('waitlist-signup', {
      body: {name: trimmedName, email: trimmedEmail, token},
    });
    if (error || data?.ok !== true) {
      return failure;
    }
  } catch {
    return failure;
  }

  try {
    localStorage.setItem('tappay_waitlist_joined', '1');
  } catch {
    /* ignore */
  }

  return { ok: true };
}

export type ConfirmWaitlistResult =
  | { ok: true }
  | { ok: false; error: 'invalid' | 'network'; message: string };

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** Completes double opt-in with the token from the confirmation email. */
export async function confirmWaitlist(token: string): Promise<ConfirmWaitlistResult> {
  const invalid: ConfirmWaitlistResult = {
    ok: false, error: 'invalid', message: 'This confirmation link is invalid or has expired.',
  };
  if (!TOKEN_RE.test(token)) {
    return invalid;
  }
  const failure: ConfirmWaitlistResult = {
    ok: false, error: 'network', message: 'Unable to confirm right now. Please try again later.',
  };
  if (!supabase) {
    return failure;
  }
  try {
    const { data, error } = await supabase.functions.invoke('waitlist-confirm', { body: { token } });
    if (!error && data?.ok === true) {
      return { ok: true };
    }
    const status = (error as { context?: { status?: number } } | null)?.context?.status;
    return status === 400 ? invalid : failure;
  } catch {
    return failure;
  }
}
