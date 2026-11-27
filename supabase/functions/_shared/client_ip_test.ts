import {trustedClientIp} from './client_ip.ts';

function assert(value: unknown): asserts value {
  if (!value) {
    throw new Error('assertion failed');
  }
}

const req = (headers: Record<string, string>) => new Request('https://edge.example.com/', {headers});

Deno.test('cf-connecting-ip wins over x-forwarded-for', () => {
  assert(trustedClientIp(req({'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '1.2.3.4, 198.51.100.1'})) === '203.0.113.7');
});

Deno.test('uses the right-most x-forwarded-for hop, never the client-controlled left-most one', () => {
  assert(trustedClientIp(req({'x-forwarded-for': '1.1.1.1, 203.0.113.7'})) === '203.0.113.7');
  assert(trustedClientIp(req({'x-forwarded-for': '9.9.9.9,  203.0.113.7 '})) === '203.0.113.7');
  assert(trustedClientIp(req({'x-forwarded-for': '203.0.113.7'})) === '203.0.113.7');
});

Deno.test('normalizes IPv6 case', () => {
  assert(trustedClientIp(req({'cf-connecting-ip': '2001:DB8::1'})) === '2001:db8::1');
});

Deno.test('missing or malformed headers give null (callers fail closed)', () => {
  assert(trustedClientIp(req({})) === null);
  assert(trustedClientIp(req({'x-forwarded-for': ''})) === null);
  assert(trustedClientIp(req({'x-forwarded-for': '203.0.113.7, unknown'})) === null);
  assert(trustedClientIp(req({'x-forwarded-for': '203.0.113.7,'})) === null);
  // A malformed Cloudflare header must not fall back to the spoofable forwarded header.
  assert(trustedClientIp(req({'cf-connecting-ip': 'garbage', 'x-forwarded-for': '203.0.113.7'})) === null);
});
