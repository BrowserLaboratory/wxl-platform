import { describe, it, expect } from 'vitest'
import { makeFakePhp } from '../../__helpers__/fakePhpInstance'
import { PhpRuntime } from '../../../.vitepress/theme/composables/usePhpRuntime'

const APP_PHP = '<?php echo "ok"; ?>'

describe('PhpRuntime singleton (initialize once)', () => {
  it('does NOT re-initialize php-wasm on second initialize call', async () => {
    const { loadPhp } = makeFakePhp({ output: 'ok' })
    const runtime = new PhpRuntime(loadPhp)

    await runtime.initialize(APP_PHP)
    await runtime.initialize(APP_PHP)

    expect(loadPhp).toHaveBeenCalledOnce()
  })
})
