/**
 * The marketing site must ship a strict CSP, HSTS, Referrer-Policy and Permissions-Policy
 * (issue #37), and must not send the deprecated X-XSS-Protection header.
 */

import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'web', 'vercel.json'), 'utf8'));
const all: Array<{key: string; value: string}> = config.headers.find(
  (h: {source: string}) => h.source === '/(.*)',
).headers;
const header = (name: string) => all.find(h => h.key.toLowerCase() === name.toLowerCase())?.value;

function directive(csp: string, name: string): string[] {
  const part = csp
    .split(';')
    .map(p => p.trim())
    .find(p => p.startsWith(`${name} `) || p === name);
  return part ? part.split(/\s+/).slice(1) : [];
}

describe('web security headers', () => {
  const csp = header('Content-Security-Policy') ?? '';

  it('sets a Content-Security-Policy that denies by default', () => {
    expect(csp).not.toBe('');
    expect(directive(csp, 'default-src')).toEqual(["'self'"]);
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'base-uri')).toEqual(["'self'"]);
    expect(directive(csp, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(csp, 'form-action')).toEqual(["'self'"]);
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('allows scripts only from self and Cloudflare Turnstile (no inline, no eval)', () => {
    expect(directive(csp, 'script-src')).toEqual(["'self'", 'https://challenges.cloudflare.com']);
    expect(csp).not.toContain("'unsafe-eval'");
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-inline'");
  });

  it('allows only the exact Supabase project and Turnstile for network and frames', () => {
    expect(directive(csp, 'connect-src')).toEqual(["'self'", 'https://nmqdajkipbsihuqeyrmm.supabase.co']);
    expect(directive(csp, 'frame-src')).toEqual(['https://challenges.cloudflare.com']);
    // No wildcard or blanket https: sources anywhere.
    for (const source of csp.split(/[\s;]+/)) {
      expect(source === '*' || source === 'https:' || source === 'http:').toBe(false);
    }
  });

  it('allows the Google Fonts the site loads, and nothing else for fonts and styles', () => {
    expect(directive(csp, 'style-src')).toEqual(["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']);
    expect(directive(csp, 'font-src')).toEqual(["'self'", 'data:', 'https://fonts.gstatic.com']);
  });

  it('sets HSTS, Referrer-Policy and a minimal Permissions-Policy', () => {
    const hsts = header('Strict-Transport-Security') ?? '';
    expect(hsts).toMatch(/max-age=63072000/);
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('preload');
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    const permissions = header('Permissions-Policy') ?? '';
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment']) {
      expect(permissions).toContain(`${feature}=()`);
    }
  });

  it('keeps nosniff and frame denial, and drops the deprecated X-XSS-Protection', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('X-Frame-Options')).toBe('DENY');
    expect(header('X-XSS-Protection')).toBeUndefined();
  });

  it('the page has no inline scripts that the CSP would block', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const tag of scripts) {
      expect(tag).toMatch(/\bsrc=/);
    }
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
  });
});
