// Trusted client address for rate limiting.
//
// Supabase Edge Functions are reached through Cloudflare and the Supabase gateway:
// - `cf-connecting-ip` is set by Cloudflare from the TCP connection and overwrites any value the
//   client sends, so it cannot be spoofed.
// - `x-forwarded-for` is appended to, not overwritten: a client can put any value in the
//   left-most entries, and only the right-most entry was added by the platform.
//
// So use `cf-connecting-ip`, else the right-most `x-forwarded-for` hop. Never the left-most one,
// and never a shared fallback such as 'unknown': callers must fail closed (503) on null, otherwise
// one client could exhaust a bucket that every header-less request shares.

const IP_RE = /^[0-9a-fA-F:.]{2,45}$/;

function valid(value: string | null | undefined): string | null {
  const ip = value?.trim().toLowerCase();
  return ip && IP_RE.test(ip) ? ip : null;
}

export function trustedClientIp(request: Request): string | null {
  const cloudflare = request.headers.get('cf-connecting-ip');
  if (cloudflare !== null) {
    // Present but malformed means something is wrong upstream: do not fall back to a spoofable header.
    return valid(cloudflare);
  }
  const hops = request.headers.get('x-forwarded-for')?.split(',') ?? [];
  return valid(hops[hops.length - 1]);
}
