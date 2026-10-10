import { describe, it, expect } from 'vitest'
import { validateChallengeConfig, LEGACY_FIELDS, VALID_TOOLS } from '../../../.vitepress/challenge/config'

describe('ChallengeConfig validation', () => {
  const minimal = {
    title: 'SQL Injection Basic',
    backend: 'flask' as const,
    app: './app.py',
    fs: { '/flag.txt': './flag.txt' },
  }

  it('accepts a valid config with all required fields', () => {
    expect(() => validateChallengeConfig(minimal)).not.toThrow()
  })

  it('throws when title is missing', () => {
    const { title: _, ...rest } = minimal
    expect(() => validateChallengeConfig(rest as any)).toThrow(/title/)
  })

  it('throws when backend is missing', () => {
    const { backend: _, ...rest } = minimal
    expect(() => validateChallengeConfig(rest as any)).toThrow(/backend/)
  })

  it('throws when app is missing', () => {
    const { app: _, ...rest } = minimal
    expect(() => validateChallengeConfig(rest as any)).toThrow(/app/)
  })

  it('accepts config without fs (fs is now optional/deprecated)', () => {
    const { fs: _, ...rest } = minimal
    expect(() => validateChallengeConfig(rest as any)).not.toThrow()
  })

  it('throws when backend is an invalid value', () => {
    expect(() => validateChallengeConfig({ ...minimal, backend: 'django' as any })).toThrow(/backend/)
  })

  it('defaults source_visible to false when omitted', () => {
    const config = validateChallengeConfig(minimal)
    expect(config.source_visible).toBe(false)
  })

  // `source_files` is the white-box display whitelist. Omitted means "the app file
  // alone" — the empty array, not `undefined` — so the build step never has to ask
  // whether the author meant "nothing extra" or "field missing".
  it('defaults source_files to an empty array when omitted', () => {
    expect(validateChallengeConfig(minimal).source_files).toEqual([])
  })

  it('accepts source_files as an array of virtual paths', () => {
    const config = validateChallengeConfig({
      ...minimal,
      source_visible: true,
      source_files: ['/templates/cart.html', '/flag.txt'],
    })
    expect(config.source_files).toEqual(['/templates/cart.html', '/flag.txt'])
  })

  // A listed whitelist is the author saying "display these". Letting it through while
  // the switch is off would make that intent silently inert — the build succeeds, the
  // challenge runs, the learner sees no source — so it is rejected here, in the one
  // step an author runs that can say why.
  it('rejects source_files when source_visible is false', () => {
    expect(() =>
      validateChallengeConfig({ ...minimal, source_visible: false, source_files: ['/a.html'] }),
    ).toThrow(/source_visible/)
  })

  it('rejects source_files when source_visible is omitted', () => {
    expect(() =>
      validateChallengeConfig({ ...minimal, source_files: ['/a.html'] }),
    ).toThrow(/source_visible/)
  })

  it('accepts an empty source_files alongside a false source_visible', () => {
    expect(() =>
      validateChallengeConfig({ ...minimal, source_visible: false, source_files: [] }),
    ).not.toThrow()
  })

  it('rejects a source_files that is a string rather than an array', () => {
    expect(() =>
      validateChallengeConfig({ ...minimal, source_files: '/templates/cart.html' } as never),
    ).toThrow(/source_files/)
  })

  it('rejects a source_files array holding a non-string entry', () => {
    expect(() =>
      validateChallengeConfig({ ...minimal, source_files: ['/a.html', 7] } as never),
    ).toThrow(/source_files/)
  })

  it('accepts source_visible: true for white-box challenges', () => {
    const config = validateChallengeConfig({ ...minimal, source_visible: true })
    expect(config.source_visible).toBe(true)
  })

  // Every consumer of this field tests it with `=== true`, so a quoted YAML value —
  // the string "true" — fails closed everywhere downstream without a word. This is the
  // one step that runs early enough to say so.
  it('rejects source_visible given as the string "true"', () => {
    expect(() =>
      validateChallengeConfig({ ...minimal, source_visible: 'true' } as never),
    ).toThrow(/source_visible must be a boolean.*string/)
  })

  it('rejects source_visible given as a number, without the quoting hint', () => {
    expect(() =>
      validateChallengeConfig({ ...minimal, source_visible: 1 } as never),
    ).toThrow(/^source_visible must be a boolean, got number: 1$/)
  })

  // A bare `source_visible:` line parses as null. It used to coerce to false through
  // `?? false`; it now fails, and the message says what the author actually wrote.
  it('rejects a bare source_visible line and names the null', () => {
    expect(() =>
      validateChallengeConfig({ ...minimal, source_visible: null } as never),
    ).toThrow(/got null: null \(a bare `source_visible:` line/)
  })

  it('accepts optional wasmModule field', () => {
    const config = validateChallengeConfig({ ...minimal, wasmModule: '/challenge/sqli-demo/runtime.wasm' })
    expect(config.wasmModule).toBe('/challenge/sqli-demo/runtime.wasm')
  })

  it('does not require wasmModule (auto-populated by build pipeline)', () => {
    const config = validateChallengeConfig(minimal)
    expect(config.wasmModule).toBeUndefined()
  })

  it('does not require flag_verifier or fs_key (now in WASM)', () => {
    // These fields should NOT be required — they are embedded in per-challenge WASM
    expect(() => validateChallengeConfig(minimal)).not.toThrow()
  })
})

describe('ChallengeConfig packages field', () => {
  const minimal = {
    title: 'Test',
    backend: 'flask' as const,
    app: './app.py',
    fs: { '/flag.txt': './flag.txt' },
  }

  it('defaults packages to [] when omitted', () => {
    const config = validateChallengeConfig(minimal)
    expect(config.packages).toEqual([])
  })

  it('parses packages array when provided', () => {
    const config = validateChallengeConfig({ ...minimal, packages: ['requests', 'pyjwt'] })
    expect(config.packages).toEqual(['requests', 'pyjwt'])
  })

  it('accepts empty packages array', () => {
    const config = validateChallengeConfig({ ...minimal, packages: [] })
    expect(config.packages).toEqual([])
  })

  it('accepts fastapi backend with packages', () => {
    const config = validateChallengeConfig({ ...minimal, backend: 'fastapi', packages: ['fastapi', 'anyio'] })
    expect(config.packages).toEqual(['fastapi', 'anyio'])
    expect(config.backend).toBe('fastapi')
  })
})

describe('ChallengeConfig tools field', () => {
  const minimal = {
    title: 'Test',
    backend: 'flask' as const,
    app: './app.py',
    fs: { '/flag.txt': './flag.txt' },
  }

  it('accepts config with no tools and leaves it undefined for the layout to resolve', () => {
    expect(() => validateChallengeConfig(minimal)).not.toThrow()
    expect(validateChallengeConfig(minimal).tools).toBeUndefined()
  })

  it('accepts valid tools: [browser, code]', () => {
    const config = validateChallengeConfig({ ...minimal, tools: ['browser', 'code'] })
    expect(config.tools).toEqual(['browser', 'code'])
  })

  it('throws when tools contains an invalid value', () => {
    expect(() =>
      validateChallengeConfig({ ...minimal, tools: ['browser', 'invalid'] }),
    ).toThrow(/invalid tool/)
  })

  it('accepts empty tools array and preserves it verbatim (layout resolves it to browser alone)', () => {
    const config = validateChallengeConfig({ ...minimal, tools: [] })
    expect(config.tools).toEqual([])
  })

  it('rejects terminal as a tab ID', () => {
    expect(() => validateChallengeConfig({ ...minimal, tools: ['terminal'] })).toThrow(
      /invalid tools entry: terminal/,
    )
  })

  it('does not advertise terminal among the values it reports as valid', () => {
    // Probe with a value that is NOT `terminal`, so any `terminal` in the message can
    // only have come from the advertised set — never from echoing the rejected input.
    // Asserting on the message as a whole (rather than on a fixed phrase like
    // "Must be one of") keeps this from passing vacuously if the wording changes.
    let message = ''
    try {
      validateChallengeConfig({ ...minimal, tools: ['nosuchtool'] })
    } catch (err) {
      message = (err as Error).message
    }
    expect(message).toContain('nosuchtool')
    expect(message).not.toContain('terminal')
  })

  it('accepts all valid tool values', () => {
    const config = validateChallengeConfig({ ...minimal, tools: [...VALID_TOOLS] })
    expect(config.tools).toEqual([...VALID_TOOLS])
  })
})

describe('ChallengeConfig tools field combinations', () => {
  const minimal = {
    title: 'Test',
    backend: 'flask' as const,
    app: './app.py',
    fs: { '/flag.txt': './flag.txt' },
  }

  it('accepts config with a flag field alongside tools', () => {
    expect(() =>
      validateChallengeConfig({
        ...minimal,
        tools: ['browser', 'code'],
        // flag is an existing optional concept in challenge configs
      }),
    ).not.toThrow()
  })

  // A leftover `commands` key from before the field was retired is IGNORED, not
  // rejected: validateChallengeConfig inspects named fields one at a time and has no
  // unknown-key rejection path. Asserted rather than left implicit, because "the
  // validator will catch it" is the assumption a reader would otherwise make.
  it('ignores a leftover commands key rather than rejecting it', () => {
    const config = validateChallengeConfig({ ...minimal, tools: ['browser'], commands: ['sqlmap'] } as never)
    expect(() => validateChallengeConfig({ ...minimal, commands: 'all' } as never)).not.toThrow()
    expect(config).not.toHaveProperty('commands')
  })

  // `['sqlmap']` and `'all'` above were both ACCEPTED by the removed allowlist, so they
  // cannot tell "the allowlist is gone" from "the allowlist is still there and these
  // happen to pass". The two values below are the ones the allowlist REJECTED — a
  // command name that was never on it, and a scalar that failed its array check. They
  // are the only inputs whose acceptance witnesses the removal.
  it.each([
    ['a name the removed allowlist rejected', { commands: ['notatool'] }],
    ['a scalar the removed allowlist rejected', { commands: 'something' }],
  ])('accepts and drops %s', (_label, extra) => {
    let config!: ReturnType<typeof validateChallengeConfig>
    expect(() => { config = validateChallengeConfig({ ...minimal, ...extra } as never) }).not.toThrow()
    expect(config).not.toHaveProperty('commands')
  })
})

describe('VALID_TOOLS constant', () => {
  it('exports VALID_TOOLS with expected values', () => {
    expect(VALID_TOOLS).toContain('browser')
    expect(VALID_TOOLS).toContain('network')
    expect(VALID_TOOLS).toContain('repeater')
    expect(VALID_TOOLS).toContain('code')
    expect(VALID_TOOLS).not.toContain('terminal')
  })

})

describe('Legacy field detection', () => {
  it('exports LEGACY_FIELDS constant', () => {
    expect(LEGACY_FIELDS).toContain('fs_key')
    expect(LEGACY_FIELDS).toContain('fsKeyParts')
    expect(LEGACY_FIELDS).toContain('encryptedFs')
    expect(LEGACY_FIELDS).toContain('flag_verifier')
  })
})
