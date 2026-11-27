#!/usr/bin/env node
/**
 * Fails if a Supabase key or any JWT is committed (#27). Scans every file tracked by git (and
 * staged ones) for:
 *  - JWTs (three base64url parts, the first two JSON objects starting with `eyJ`), which covers the
 *    legacy Supabase anon / service_role keys;
 *  - Supabase API keys (`sb_publishable_…`, `sb_secret_…`).
 * Build-time config belongs in the environment (.env, CI variables), never in the repository.
 * Usage: node scripts/check-committed-secrets.js
 */
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const PATTERNS = [
  {name: 'JWT / legacy Supabase key', re: /eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{16,}/g},
  {name: 'Supabase API key', re: /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]{16,}/g},
];
// Lockfiles hold integrity hashes, not keys; binary files are skipped by the NUL check below.
const SKIP_NAMES = new Set(['package-lock.json', 'yarn.lock', 'Podfile.lock']);

function trackedFiles() {
  const out = execFileSync('git', ['ls-files', '-z', '--cached'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
  return out.split('\0').filter(Boolean);
}

function scan(files) {
  const findings = [];
  for (const file of files) {
    if (SKIP_NAMES.has(path.basename(file))) {
      continue;
    }
    let text;
    try {
      const buffer = fs.readFileSync(file);
      if (buffer.includes(0)) {
        continue; // binary
      }
      text = buffer.toString('utf8');
    } catch {
      continue; // deleted in the working tree
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const {name, re} of PATTERNS) {
        re.lastIndex = 0;
        if (re.test(line)) {
          findings.push(`${file}:${i + 1}: ${name}`);
        }
      }
    });
  }
  return findings;
}

if (require.main === module) {
  const findings = scan(trackedFiles());
  if (findings.length) {
    console.error('Committed secrets found. Move them to build-time config (.env / CI variables) and rotate them:');
    for (const f of findings) {
      console.error(`  ${f}`);
    }
    process.exit(1);
  }
  console.log('No committed Supabase keys or JWTs found.');
}

module.exports = {scan, PATTERNS};
