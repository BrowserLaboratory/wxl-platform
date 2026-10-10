import { describe, it, expect, vi } from 'vitest'
import { makeFakePhp } from '../../__helpers__/fakePhpInstance'
import { PhpRuntime } from '../../../.vitepress/theme/composables/usePhpRuntime'

const APP_PHP = '<?php echo file_get_contents("/flag.txt"); ?>'
const FLAG_CONTENT = 'CTF{php_flag_test}'

describe('PhpRuntime FS mount', () => {
  it('writes FS entries into php-wasm before execution', async () => {
    const { loadPhp, writeFile } = makeFakePhp({ output: FLAG_CONTENT })
    const runtime = new PhpRuntime(loadPhp)

    const fsEntries: Record<string, Uint8Array> = {
      '/flag.txt': new TextEncoder().encode(FLAG_CONTENT),
    }
    await runtime.initialize(APP_PHP, fsEntries)

    expect(writeFile).toHaveBeenCalledWith('/flag.txt', expect.any(Uint8Array))
  })

  it('writes FS before any request is handled', async () => {
    const { loadPhp, run, writeFile } = makeFakePhp()
    const runtime = new PhpRuntime(loadPhp)

    await runtime.initialize(APP_PHP, { '/flag.txt': new TextEncoder().encode(FLAG_CONTENT) })
    await runtime.handleRequest(new Request('https://challenge-test.localhost/'))

    // A challenge whose app reads a mounted file on its very first request must
    // find it there, so the mount has to complete before any execution starts.
    expect(writeFile.mock.invocationCallOrder[0]).toBeLessThan(run.mock.invocationCallOrder[0])
  })
})
