/**
 * #27: the Supabase config is build-time only (never committed), and CI fails on committed keys.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const babel = require('@babel/core');
const inlineAppConfig = require('../scripts/babel-inline-app-config');
const {scan} = require('../scripts/check-committed-secrets');

const NAMES: string[] = inlineAppConfig.INLINED;
// Env access by dynamic name: the plugin rewrites literal reads in this file too.
const [URL_NAME, KEY_NAME] = NAMES;
const env = process.env as Record<string, string | undefined>;
const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  for (const name of NAMES) {
    saved[name] = process.env[name];
    delete process.env[name];
  }
});
afterEach(() => {
  for (const name of NAMES) {
    if (saved[name] === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = saved[name];
    }
  }
});

const transform = (code: string) =>
  babel.transformSync(code, {babelrc: false, configFile: false, plugins: [inlineAppConfig]}).code as string;
// Built at runtime so this test file itself is not rewritten by the plugin.
const read = (name: string) => ['process', 'env', name].join('.');

describe('babel-inline-app-config', () => {
  it('inlines the configured values as string literals', () => {
    env[URL_NAME] = 'https://example-ref.supabase.co';
    env[KEY_NAME] = 'anon-value';
    const out = transform(`const a = ${read('TAPPAY_SUPABASE_URL')}; const b = process.env["TAPPAY_SUPABASE_ANON_KEY"];`);
    expect(out).toContain('const a = "https://example-ref.supabase.co"');
    expect(out).toContain('const b = "anon-value"');
    expect(out).not.toContain('process.env');
  });

  it('inlines undefined when a value is missing (never a committed fallback)', () => {
    expect(transform(`const a = ${read('TAPPAY_SUPABASE_URL')};`)).toBe('const a = undefined;');
  });

  it('leaves writes to process.env untouched', () => {
    env[URL_NAME] = 'https://x.supabase.co';
    const out = transform(`${read('TAPPAY_SUPABASE_URL')} = 'y'; delete ${read('TAPPAY_SUPABASE_URL')};`);
    expect(out).toContain("process.env.TAPPAY_SUPABASE_URL = 'y'");
    expect(out).toContain('delete process.env.TAPPAY_SUPABASE_URL');
  });

  it('never inlines any other environment variable', () => {
    process.env.SOME_SECRET_FOR_TEST = 'do-not-leak';
    try {
      const out = transform(`const a = ${read('SOME_SECRET_FOR_TEST')}; const b = ${read('HOME')};`);
      expect(out).not.toContain('do-not-leak');
      expect(out).toContain('process.env.SOME_SECRET_FOR_TEST');
    } finally {
      delete process.env.SOME_SECRET_FOR_TEST;
    }
  });

  it('reads TAPPAY_* values from .env, without overriding the environment', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tappay-env-'));
    const file = path.join(dir, '.env');
    fs.writeFileSync(
      file,
      [
        '# comment',
        'export TAPPAY_SUPABASE_URL="https://from-file.supabase.co"',
        "TAPPAY_SUPABASE_ANON_KEY = 'file-key'",
        'DEPLOYER_PRIVATE_KEY=never-read',
      ].join('\n'),
    );
    env[KEY_NAME] = 'shell-key';
    inlineAppConfig.loadAppEnv(file);
    expect(env[URL_NAME]).toBe('https://from-file.supabase.co');
    expect(env[KEY_NAME]).toBe('shell-key');
    expect(process.env.DEPLOYER_PRIVATE_KEY).not.toBe('never-read');
    fs.rmSync(dir, {recursive: true, force: true});
  });
});

describe('check-committed-secrets', () => {
  function scanText(name: string, text: string): string[] {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tappay-scan-'));
    const file = path.join(dir, name);
    fs.writeFileSync(file, text);
    try {
      return scan([file]);
    } finally {
      fs.rmSync(dir, {recursive: true, force: true});
    }
  }
  // Assembled at runtime so this file does not itself contain a key-shaped string.
  const jwt = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJyb2xlIjoiYW5vbiIsImlzcyI6InRlc3QifQ', 'c2lnbmF0dXJlLXBhcnQtZm9yLXRlc3Rz'].join('.');

  it('flags a committed JWT (legacy Supabase anon / service_role key)', () => {
    expect(scanText('supabase.ts', `const KEY = '${jwt}';`)).toEqual([expect.stringMatching(/supabase\.ts:1: JWT/)]);
  });

  it('flags new-style Supabase API keys', () => {
    const key = ['sb', 'secret', 'abcdefghijklmnopqrstu'].join('_');
    expect(scanText('config.js', `x = "${key}"`)).toEqual([expect.stringMatching(/Supabase API key/)]);
  });

  it('ignores ordinary code and lockfiles', () => {
    expect(scanText('app.ts', 'const url = process.env.X; // eyJ is just a prefix')).toEqual([]);
    expect(scanText('package-lock.json', jwt)).toEqual([]);
  });

  it('the repository itself has no committed keys', () => {
    const {execFileSync} = require('child_process');
    const files = execFileSync('git', ['ls-files', '-z'], {encoding: 'utf8'}).split('\0').filter(Boolean);
    expect(scan(files)).toEqual([]);
  });
});

it('the app config file contains no Supabase URL or key', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'config', 'supabase.ts'), 'utf8');
  expect(source).not.toMatch(/https:\/\/[a-z0-9]+\.supabase\.co/);
  expect(source).not.toMatch(/eyJ[A-Za-z0-9_-]{8,}\./);
});
