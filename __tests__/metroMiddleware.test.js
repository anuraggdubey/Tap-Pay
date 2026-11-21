import {fork} from 'child_process';
import {Buffer} from 'buffer';
import http from 'http';
import path from 'path';
import zlib from 'zlib';

let server;
let port;
let stopped;
let exitCode;

beforeEach(async () => {
  exitCode = undefined;
  server = fork(path.join(__dirname, 'metroMiddlewareServer.cjs'), {stdio: ['ignore', 'ignore', 'ignore', 'ipc']});
  stopped = new Promise(resolve => server.once('exit', code => { exitCode = code; resolve(); }));
  port = await new Promise((resolve, reject) => {
    server.once('message', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Middleware exited during startup: ${code}`)));
  });
});

afterEach(async () => {
  server.kill();
  await stopped;
});

async function request({payload, trailing = false, url = '/open-stack-frame', method = 'POST', headers = {}}) {
  const body = payload || Buffer.alloc(0);
  const tail = trailing ? Buffer.from('unexpected-trailing-bytes') : Buffer.alloc(0);
  let req;
  const response = new Promise(resolve => {
    req = http.request({host: '127.0.0.1', port, path: url, method, headers: {...headers, 'content-length': body.length + tail.length}}, res => {
      res.resume();
      res.once('end', () => resolve(res.statusCode));
      res.once('error', () => resolve(0));
    });
    req.once('error', () => resolve(0));
    req.setTimeout(3000, () => req.destroy());
  });
  if (trailing) {
    req.write(body);
    // Separate the completed gzip member from the final bytes on the wire.
    await new Promise(resolve => setTimeout(resolve, 100));
    req.end(tail);
  } else {
    req.end(body);
  }
  return response;
}

const frame = () => zlib.gzipSync(Buffer.from(JSON.stringify({file: '/nonexistent/tappay-frame.js', lineNumber: 1})));
const gzipHeaders = {'content-type': 'application/json', 'content-encoding': 'gzip'};

it('continues serving after trailing bytes arrive behind a completed compressed body', async () => {
  const payload = Buffer.concat([frame(), Buffer.from([0])]);
  await request({payload, trailing: true, headers: gzipHeaders});
  expect(await request({url: '/status', method: 'GET'})).toBe(200);
  expect(exitCode).toBeUndefined();
  expect(await request({payload: frame(), headers: gzipHeaders})).toBe(200);
});

it('still accepts a valid compressed stack-frame request', async () => {
  expect(await request({payload: frame(), headers: gzipHeaders})).toBe(200);
});

it('rejects empty or invalid JSON requests without terminating the middleware', async () => {
  expect(await request({})).toBe(400);
  expect(await request({payload: Buffer.from('{invalid'), headers: {'content-type': 'application/json'}})).toBe(400);
  expect(await request({url: '/status', method: 'GET'})).toBe(200);
  expect(exitCode).toBeUndefined();
});
