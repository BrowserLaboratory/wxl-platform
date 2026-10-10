import { spawnSync } from 'node:child_process';
import path from 'node:path';

const OPENERS = {
  darwin: {
    command: 'open',
    method: 'open',
    args: (target) => [target],
  },
  linux: {
    command: 'xdg-open',
    method: 'xdg-open',
    args: (target) => [target],
  },

};

function launchTarget(target, options = {}) {
  const platform = options.platform || process.platform;
  // Disabled pending a reviewed replacement and native Windows verification.
  // This gate covers both artifact files and loopback preview URLs.
  if (platform === 'win32') {
    return { requested: true, status: 'disabled', target, method: null };
  }
  const opener = OPENERS[platform];
  if (!opener) {
    return {
      requested: true,
      status: 'unsupported',
      target,
      method: null,
    };
  }

  const spawn = options.spawn || spawnSync;
  let result;
  try {
    result = spawn(opener.command, opener.args(target), {
      encoding: 'utf8',
      shell: false,
      stdio: 'ignore',
      timeout: options.timeoutMs || 5000,
      windowsHide: true,
    });
  } catch {
    result = { error: new Error('opener threw') };
  }

  let status = 'opened';
  if (result?.error?.code === 'ENOENT') status = 'unsupported';
  else if (result?.error || result?.signal || result?.status !== 0) status = 'failed';

  return {
    requested: true,
    status,
    target,
    method: opener.method,
  };
}

export function openArtifact(target, options = {}) {
  return launchTarget(path.resolve(target), options);
}

export function openLoopbackUrl(target, options = {}) {
  let url;
  try {
    url = new URL(target);
  } catch {
    throw new TypeError('Preview URL must be a valid loopback HTTP URL.');
  }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port) {
    throw new TypeError('Preview URL must be a loopback URL using http://127.0.0.1:<port>.');
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new TypeError('Preview URL must target the loopback preview root.');
  }
  return launchTarget(url.href, options);
}
