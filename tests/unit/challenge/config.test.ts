import { describe, it, expect } from 'vitest'
import {
  validateChallengeDeclaration,
  validateChallengeBrief,
  LEGACY_FIELDS,
  VALID_TOOLS,
} from '../../../.vitepress/challenge/config'

describe('ChallengeDeclaration validation', () => {
  const minimal = {
    backend: 'flask' as const,
    app: './app.py',
  }

  it('accepts a valid config with all required fields', () => {
    expect(() => validateChallengeDeclaration(minimal)).not.toThrow()
  })

  it('throws when backend is missing', () => {
    const { backend: _, ...rest } = minimal
    expect(() => validateChallengeDeclaration(rest as any)).toThrow(/backend/)
  })

  it('throws when app is missing', () => {
    const { app: _, ...rest } = minimal
    expect(() => validateChallengeDeclaration(rest as any)).toThrow(/app/)
  })

  it('throws when backend is an invalid value', () => {
    expect(() => validateChallengeDeclaration({ ...minimal, backend: 'django' as any })).toThrow(/backend/)
  })

  it('defaults source_visible to false when omitted', () => {
    const config = validateChallengeDeclaration(minimal)
    expect(config.source_visible).toBe(false)
  })

  // `source_files` is the white-box display whitelist. Omitted means "the app file
  // alone" — the empty array, not `undefined` — so the build step never has to ask
  // whether the author meant "nothing extra" or "field missing".
  it('defaults source_files to an empty array when omitted', () => {
    expect(validateChallengeDeclaration(minimal).source_files).toEqual([])
  })

  it('accepts source_files as an array of virtual paths', () => {
    const config = validateChallengeDeclaration({
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
      validateChallengeDeclaration({ ...minimal, source_visible: false, source_files: ['/a.html'] }),
    ).toThrow(/source_visible/)
  })

  it('rejects source_files when source_visible is omitted', () => {
    expect(() =>
      validateChallengeDeclaration({ ...minimal, source_files: ['/a.html'] }),
    ).toThrow(/source_visible/)
  })

  it('accepts an empty source_files alongside a false source_visible', () => {
    expect(() =>
      validateChallengeDeclaration({ ...minimal, source_visible: false, source_files: [] }),
    ).not.toThrow()
  })

  it('rejects a source_files that is a string rather than an array', () => {
    expect(() =>
      validateChallengeDeclaration({ ...minimal, source_files: '/templates/cart.html' } as never),
    ).toThrow(/source_files/)
  })

  it('rejects a source_files array holding a non-string entry', () => {
    expect(() =>
      validateChallengeDeclaration({ ...minimal, source_files: ['/a.html', 7] } as never),
    ).toThrow(/source_files/)
  })

  it('accepts source_visible: true for white-box challenges', () => {
    const config = validateChallengeDeclaration({ ...minimal, source_visible: true })
    expect(config.source_visible).toBe(true)
  })

  // Every consumer of this field tests it with `=== true`, so a quoted YAML value —
  // the string "true" — fails closed everywhere downstream without a word. This is the
  // one step that runs early enough to say so.
  it('rejects source_visible given as the string "true"', () => {
    expect(() =>
      validateChallengeDeclaration({ ...minimal, source_visible: 'true' } as never),
    ).toThrow(/source_visible must be a boolean.*string/)
  })

  it('rejects source_visible given as a number, without the quoting hint', () => {
    expect(() =>
      validateChallengeDeclaration({ ...minimal, source_visible: 1 } as never),
    ).toThrow(/^source_visible must be a boolean, got number: 1$/)
  })

  // A bare `source_visible:` line parses as null. It used to coerce to false through
  // `?? false`; it now fails, and the message says what the author actually wrote.
  it('rejects a bare source_visible line and names the null', () => {
    expect(() =>
      validateChallengeDeclaration({ ...minimal, source_visible: null } as never),
    ).toThrow(/got null: null \(a bare `source_visible:` line/)
  })

  it('accepts optional wasmModule field', () => {
    const config = validateChallengeDeclaration({ ...minimal, wasmModule: '/challenge/sqli-demo/runtime.wasm' })
    expect(config.wasmModule).toBe('/challenge/sqli-demo/runtime.wasm')
  })

  it('does not require wasmModule (auto-populated by build pipeline)', () => {
    const config = validateChallengeDeclaration(minimal)
    expect(config.wasmModule).toBeUndefined()
  })

  it('does not require flag_verifier or fs_key (now in WASM)', () => {
    // These fields should NOT be required — they are embedded in per-challenge WASM
    expect(() => validateChallengeDeclaration(minimal)).not.toThrow()
  })

  it('D75, D76: the returned declaration carries no fs and no description key', () => {
    for (const input of [minimal, { ...minimal, fs: { '/a': 'b' } }]) {
      const keys = Object.keys(validateChallengeDeclaration(input as never))
      expect(keys).not.toContain('fs')
      expect(keys).not.toContain('description')
    }
  })
})

describe('ChallengeDeclaration packages field', () => {
  const minimal = {
    backend: 'flask' as const,
    app: './app.py',
  }

  it('defaults packages to [] when omitted', () => {
    const config = validateChallengeDeclaration(minimal)
    expect(config.packages).toEqual([])
  })

  it('parses packages array when provided', () => {
    const config = validateChallengeDeclaration({ ...minimal, packages: ['requests', 'pyjwt'] })
    expect(config.packages).toEqual(['requests', 'pyjwt'])
  })

  it('accepts empty packages array', () => {
    const config = validateChallengeDeclaration({ ...minimal, packages: [] })
    expect(config.packages).toEqual([])
  })

  it('accepts fastapi backend with packages', () => {
    const config = validateChallengeDeclaration({ ...minimal, backend: 'fastapi', packages: ['fastapi', 'anyio'] })
    expect(config.packages).toEqual(['fastapi', 'anyio'])
    expect(config.backend).toBe('fastapi')
  })
})

describe('ChallengeDeclaration tools field', () => {
  const minimal = {
    backend: 'flask' as const,
    app: './app.py',
  }

  it('accepts config with no tools and leaves it undefined for the layout to resolve', () => {
    expect(() => validateChallengeDeclaration(minimal)).not.toThrow()
    expect(validateChallengeDeclaration(minimal).tools).toBeUndefined()
  })

  it('accepts valid tools: [browser, code]', () => {
    const config = validateChallengeDeclaration({ ...minimal, tools: ['browser', 'code'] })
    expect(config.tools).toEqual(['browser', 'code'])
  })

  it('throws when tools contains an invalid value', () => {
    expect(() =>
      validateChallengeDeclaration({ ...minimal, tools: ['browser', 'invalid'] }),
    ).toThrow(/invalid tool/)
  })

  it('accepts empty tools array and preserves it verbatim (layout resolves it to browser alone)', () => {
    const config = validateChallengeDeclaration({ ...minimal, tools: [] })
    expect(config.tools).toEqual([])
  })

  it('rejects terminal as a tab ID', () => {
    expect(() => validateChallengeDeclaration({ ...minimal, tools: ['terminal'] })).toThrow(
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
      validateChallengeDeclaration({ ...minimal, tools: ['nosuchtool'] })
    } catch (err) {
      message = (err as Error).message
    }
    expect(message).toContain('nosuchtool')
    expect(message).not.toContain('terminal')
  })

  it('accepts all valid tool values', () => {
    const config = validateChallengeDeclaration({ ...minimal, tools: [...VALID_TOOLS] })
    expect(config.tools).toEqual([...VALID_TOOLS])
  })
})

describe('ChallengeDeclaration tools field combinations', () => {
  const minimal = {
    backend: 'flask' as const,
    app: './app.py',
  }

  it('accepts config with a flag field alongside tools', () => {
    expect(() =>
      validateChallengeDeclaration({
        ...minimal,
        tools: ['browser', 'code'],
        // flag is an existing optional concept in challenge configs
      }),
    ).not.toThrow()
  })

  // A leftover `commands` key from before the field was retired is IGNORED, not
  // rejected: validateChallengeDeclaration inspects named fields one at a time and has no
  // unknown-key rejection path. Asserted rather than left implicit, because "the
  // validator will catch it" is the assumption a reader would otherwise make.
  it('ignores a leftover commands key rather than rejecting it', () => {
    const config = validateChallengeDeclaration({ ...minimal, tools: ['browser'], commands: ['sqlmap'] } as never)
    expect(() => validateChallengeDeclaration({ ...minimal, commands: 'all' } as never)).not.toThrow()
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
    let config!: ReturnType<typeof validateChallengeDeclaration>
    expect(() => { config = validateChallengeDeclaration({ ...minimal, ...extra } as never) }).not.toThrow()
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

describe('validateChallengeDeclaration (Y9): backend is required', () => {
  it('throws when backend is absent', () => {
    expect(() => validateChallengeDeclaration({ app: 'app.py' })).toThrow(
      /^missing required field: backend$/,
    )
  })

  it('throws when backend is null', () => {
    expect(() => validateChallengeDeclaration({ backend: null, app: 'app.py' })).toThrow(
      /^missing required field: backend$/,
    )
  })
})

describe('validateChallengeDeclaration (Y12): app must be a string', () => {
  it.each([
    ['number', 3, 'number'],
    ['boolean', true, 'boolean'],
    ['object', [], 'object'],
  ])('throws VM12 for app: %s', (_label, app, typeofLabel) => {
    expect(() => validateChallengeDeclaration({ backend: 'flask', app })).toThrow(
      new RegExp(`^app must be a string, got ${typeofLabel}$`),
    )
  })

  it('does not crash the backend check first', () => {
    expect(() => validateChallengeDeclaration({ backend: 'flask', app: 3 })).not.toThrow(
      /backend must be one of/,
    )
  })
})

describe('validateChallengeDeclaration (Y14): title, description and layout are brief keys', () => {
  it('throws VM5 naming title alone', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', title: 'x' }),
    ).toThrow(
      /^challenge\.yaml carries brief key\(s\) title; title, description and layout belong in each brief's frontmatter$/,
    )
  })

  it('throws VM5 naming description alone', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', description: 'x' }),
    ).toThrow(/^challenge\.yaml carries brief key\(s\) description;/)
  })

  it('throws VM5 naming layout alone', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', layout: 'challenge' }),
    ).toThrow(/^challenge\.yaml carries brief key\(s\) layout;/)
  })

  it('throws VM5 listing all three in file order', () => {
    const obj: Record<string, unknown> = {}
    obj.backend = 'flask'
    obj.app = 'app.py'
    obj.layout = 'challenge'
    obj.title = 'x'
    obj.description = 'y'
    expect(() => validateChallengeDeclaration(obj)).toThrow(
      /^challenge\.yaml carries brief key\(s\) layout, title, description;/,
    )
  })
})

describe('validateChallengeDeclaration (Y19): unknown keys pass through', () => {
  it.each([
    ['id', 7],
    ['commands', []],
    ['author', 'x'],
  ])('does not throw for an unknown key %s', (key, value) => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', [key]: value }),
    ).not.toThrow()
  })
})

describe('validateChallengeDeclaration (Y21): every optional key absent gives defaults', () => {
  it('returns the documented defaults', () => {
    const result = validateChallengeDeclaration({ backend: 'flask', app: 'app.py' })
    expect(result.source_visible).toBe(false)
    expect(result.source_files).toEqual([])
    expect(result.packages).toEqual([])
    expect(result.tools).toBeUndefined()
    expect(result.flag).toBeUndefined()
  })
})

describe('validateChallengeBrief (Y23): title and layout only', () => {
  it('returns description: undefined', () => {
    const result = validateChallengeBrief({ title: 'x', layout: 'challenge' })
    expect(result.description).toBeUndefined()
    expect(result.title).toBe('x')
    expect(result.layout).toBe('challenge')
  })
})

describe('validateChallengeDeclaration (Y10): app is required', () => {
  it('throws when app is absent', () => {
    expect(() => validateChallengeDeclaration({ backend: 'flask' })).toThrow(
      /^missing required field: app$/,
    )
  })

  it('throws when app is null', () => {
    expect(() => validateChallengeDeclaration({ backend: 'flask', app: null })).toThrow(
      /^missing required field: app$/,
    )
  })

  it('passes with no title', () => {
    expect(() => validateChallengeDeclaration({ backend: 'flask', app: 'app.py' })).not.toThrow()
  })
})

describe('validateChallengeDeclaration (Y11): backend outside the enum', () => {
  it('throws for django', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'django', app: 'app.py' }),
    ).toThrow(/^backend must be one of flask, fastapi, php, got: django$/)
  })
})

describe('validateChallengeDeclaration (Y15): non-boolean source_visible keeps today\'s three messages', () => {
  it('throws the quoting hint for a quoted "true"', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', source_visible: 'true' }),
    ).toThrow(
      /^source_visible must be a boolean, got string: "true" \(a quoted YAML value is a string\)$/,
    )
  })

  it('throws the null hint for null', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', source_visible: null }),
    ).toThrow(
      /^source_visible must be a boolean, got null: null \(a bare `source_visible:` line with no value parses as null\)$/,
    )
  })

  it('throws with no hint for a number', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', source_visible: 1 }),
    ).toThrow(/^source_visible must be a boolean, got number: 1$/)
  })
})

describe('validateChallengeDeclaration (Y16): source_files keeps today\'s rules', () => {
  it('throws for a string instead of an array', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', source_files: '/a' }),
    ).toThrow(/^source_files must be an array of virtual paths$/)
  })

  it('throws for a non-string entry', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', source_files: ['/a', 1] }),
    ).toThrow(/^source_files entries must be strings, got: number$/)
  })

  it('throws when source_visible is false', () => {
    expect(() =>
      validateChallengeDeclaration({
        backend: 'flask',
        app: 'app.py',
        source_files: ['/a'],
        source_visible: false,
      }),
    ).toThrow(
      /^source_files lists paths to display but source_visible is not true; set source_visible: true or remove source_files$/,
    )
  })

  it('throws when source_visible is absent', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', source_files: ['/a'] }),
    ).toThrow(
      /^source_files lists paths to display but source_visible is not true; set source_visible: true or remove source_files$/,
    )
  })

  it('passes an empty array alongside a false source_visible', () => {
    expect(() =>
      validateChallengeDeclaration({
        backend: 'flask',
        app: 'app.py',
        source_files: [],
        source_visible: false,
      }),
    ).not.toThrow()
  })
})

describe('validateChallengeDeclaration (Y17): tools keeps today\'s rules', () => {
  it('throws for a string instead of an array', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', tools: 'browser' }),
    ).toThrow(/^tools must be an array of valid tab IDs$/)
  })

  it('throws for an invalid entry', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', tools: ['terminal'] }),
    ).toThrow(/^invalid tools entry: terminal\. Must be one of browser, network, repeater, code$/)
  })

  it('preserves an empty array, not defaulted', () => {
    const result = validateChallengeDeclaration({ backend: 'flask', app: 'app.py', tools: [] })
    expect(result.tools).toEqual([])
  })

  it('leaves tools undefined when absent', () => {
    const result = validateChallengeDeclaration({ backend: 'flask', app: 'app.py' })
    expect(result.tools).toBeUndefined()
  })
})

describe('validateChallengeDeclaration (Y18): non-string flag', () => {
  it('throws for a number', () => {
    expect(() =>
      validateChallengeDeclaration({ backend: 'flask', app: 'app.py', flag: 5 }),
    ).toThrow(/^flag must be a string, got: number$/)
  })
})

describe('Legacy field detection', () => {
  it('exports LEGACY_FIELDS constant', () => {
    expect(LEGACY_FIELDS).toContain('fs')
    expect(LEGACY_FIELDS).toContain('fs_key')
    expect(LEGACY_FIELDS).toContain('fsKeyParts')
    expect(LEGACY_FIELDS).toContain('encryptedFs')
    expect(LEGACY_FIELDS).toContain('flag_verifier')
  })
})

describe('Y-q1 (D75): the single-schema validator is gone', () => {
  it('no longer exports validateChallengeConfig', async () => {
    const mod = await import('../../../.vitepress/challenge/config')
    expect(Object.keys(mod)).not.toContain('validateChallengeConfig')
  })
})
