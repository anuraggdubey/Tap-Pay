export type Signup = {name: string; email: string; token: string};

export function validateSignup(value: unknown): Signup | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const {name, email, token} = value as Record<string, unknown>;
  if (typeof name !== 'string' || typeof email !== 'string' || typeof token !== 'string') {
    return null;
  }
  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const nameLength = Array.from(trimmedName).length;
  if (nameLength < 2 || nameLength > 100 || normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      !token.trim() || token.length > 2048) {
    return null;
  }
  return {name: trimmedName, email: normalizedEmail, token};
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
