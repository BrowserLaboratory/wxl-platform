import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { openArtifact, openLoopbackUrl } from '../bin/open-artifact.mjs';

const target = path.resolve("/tmp/-複雜 path 'quoted'/diagram.html");

test('open artifact: uses argument arrays without shell interpolation on every supported platform', () => {
  const cases = [
    {
      platform: 'darwin',
      command: 'open',
      args: [target],
      method: 'open',
    },
    {
      platform: 'linux',
      command: 'xdg-open',
      args: [target],
      method: 'xdg-open',
    },

  ];

  for (const expected of cases) {
    let invocation;
    const result = openArtifact(target, {
      platform: expected.platform,
      spawn(command, args, options) {
        invocation = { command, args, options };
        return { status: 0 };
      },
    });

    assert.deepEqual(result, {
      requested: true,
      status: 'opened',
      target,
      method: expected.method,
    });
    assert.equal(invocation.command, expected.command);
    assert.deepEqual(invocation.args, expected.args);
    assert.equal(invocation.options.shell, false);
    assert.equal(invocation.options.timeout, 5000);
  }
});

test('open artifact: distinguishes missing support from opener execution failure', () => {
  const missing = openArtifact(target, {
    platform: 'linux',
    spawn() {
      return { error: Object.assign(new Error('missing'), { code: 'ENOENT' }) };
    },
  });
  assert.equal(missing.status, 'unsupported');
  assert.equal(missing.method, 'xdg-open');

  const timedOut = openArtifact(target, {
    platform: 'darwin',
    spawn() {
      return { error: Object.assign(new Error('timed out'), { code: 'ETIMEDOUT' }) };
    },
  });
  assert.equal(timedOut.status, 'failed');
  assert.equal(timedOut.method, 'open');

  const unknown = openArtifact(target, { platform: 'plan9' });
  assert.deepEqual(unknown, {
    requested: true,
    status: 'unsupported',
    target,
    method: null,
  });
});

test('open artifact: live preview opens only an exact loopback HTTP root', () => {
  const url = 'http://127.0.0.1:43127/';
  let invocation;
  const result = openLoopbackUrl(url, {
    platform: 'darwin',
    spawn(command, args, options) {
      invocation = { command, args, options };
      return { status: 0 };
    },
  });

  assert.deepEqual(result, {
    requested: true,
    status: 'opened',
    target: url,
    method: 'open',
  });
  assert.deepEqual(invocation.args, [url]);
  assert.equal(invocation.options.shell, false);

  for (const rejected of [
    'https://127.0.0.1:43127/',
    'http://localhost:43127/',
    'http://0.0.0.0:43127/',
    'http://127.0.0.1:43127/path',
    'http://127.0.0.1:43127/?source=secret',
    'not a url',
  ]) {
    assert.throws(() => openLoopbackUrl(rejected), /loopback|valid/i, rejected);
  }
});


test('Windows automatic opening is disabled for artifacts and preview without spawning', () => {
  let calls = 0;
  const options = { platform: 'win32', spawn() { calls++; return { status: 0 }; } };
  for (const input of ['diagram.html', "複雜 path 'quoted'/diagram.html", 'semi;colon.html', 'literal$(text).html']) {
    const result = openArtifact(input, options);
    assert.equal(calls, 0);
    assert.deepEqual(result, {
      requested: true, status: 'disabled', target: path.resolve(input), method: null,
    });
  }
  assert.deepEqual(openLoopbackUrl('http://127.0.0.1:43127/', options), {
    requested: true, status: 'disabled', target: 'http://127.0.0.1:43127/', method: null,
  });
  assert.throws(() => openLoopbackUrl('https://example.com/', options), /loopback/);
  assert.equal(calls, 0);
});
