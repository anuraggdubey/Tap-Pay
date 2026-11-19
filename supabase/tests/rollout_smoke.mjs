import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {createServer} from 'node:http';
import {promisify} from 'node:util';
import test from 'node:test';

const exec = promisify(execFile);
const script = new URL('../../scripts/supabase-rollout.sh', import.meta.url).pathname;
const key = 'local-test-key-not-a-secret';
const origin = 'https://example.invalid';
const generic = {message: 'Unable to join the waitlist. Please try again later.'};

test('dry-run needs no credentials or external tools and reveals no values', async () => {
  const {stdout} = await exec('/bin/bash', [script, '--dry-run'], {env: {PATH: process.env.PATH, TURNSTILE_SECRET_KEY: key}});
  assert.match(stdout, /Would audit/);
  assert.match(stdout, /Would stream secrets/);
  assert.match(stdout, /Remaining maintainer steps/);
  assert.ok(!stdout.includes(key));
});

test('invalid flags and missing database configuration fail closed', async () => {
  await assert.rejects(exec('/bin/bash', [script, '--unknown'], {env: {PATH: process.env.PATH}}), /Unknown argument/);
  await assert.rejects(exec('/bin/bash', [script, '--audit'], {env: {PATH: process.env.PATH}}), /Required environment variable missing: PGHOST/);
});

async function smoke(overrides = {}) {
  const server = createServer((request, response) => {
    assert.equal(request.headers.apikey, key);
    assert.equal(request.headers.authorization, `Bearer ${key}`);
    assert.equal(request.headers.origin, origin);
    if (request.url === '/rest/v1/waitlist') {
      response.writeHead(overrides.insertStatus || 403, {'Content-Type': 'application/json'});
      response.end(JSON.stringify({code: overrides.insertCode || '42501'}));
    } else if (request.method === 'OPTIONS') {
      response.writeHead(204, {'access-control-allow-origin': overrides.origin || origin});
      response.end();
    } else {
      response.writeHead(400, {'Content-Type': 'application/json'});
      response.end(JSON.stringify(overrides.error || generic));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    return await exec('/bin/bash', [script, '--smoke'], {env: {
      PATH: process.env.PATH,
      SUPABASE_URL: `http://127.0.0.1:${server.address().port}`,
      SUPABASE_ANON_KEY: key,
      ALLOWED_ORIGINS: `${origin},https://second.example.invalid`,
    }});
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('smoke validates permission denial, case-insensitive CORS and generic token rejection', async () => {
  const {stdout, stderr} = await smoke();
  assert.match(stdout, /SMOKE: anon insert denied/);
  assert.match(stdout, /SMOKE: allowed-origin CORS accepted/);
  assert.match(stdout, /SMOKE: missing token rejected generically/);
  assert.ok(!(stdout + stderr).includes(key));
});

test('smoke rejects unrelated gateway errors, duplicates, wrong CORS and leaked errors', async () => {
  await assert.rejects(smoke({insertCode: 'PGRST301'}), /did not return permission denied/);
  await assert.rejects(smoke({insertStatus: 409}), /was not denied/);
  await assert.rejects(smoke({origin: 'https://wrong.example.invalid'}), /did not allow the configured origin/);
  await assert.rejects(smoke({error: {message: 'Internal database details'}}), /did not return the generic error/);
});
