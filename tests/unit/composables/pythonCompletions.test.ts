import { describe, it, expect } from 'vitest'
import type { CompletionContext } from '@codemirror/autocomplete'
import {
  STDLIB_MODULES,
  pythonStdlibCompletions,
} from '../../../.vitepress/theme/composables/pythonCompletions'

/** The smallest stand-in for the pieces of CompletionContext the source actually reads. */
function contextAt(word: { from: number; to: number; text: string } | null): CompletionContext {
  return { matchBefore: () => word } as unknown as CompletionContext
}

function options() {
  const result = pythonStdlibCompletions()(contextAt({ from: 0, to: 2, text: 'ma' }))
  if (!result || result === null) throw new Error('completion source returned nothing')
  return result.options
}

describe('STDLIB_MODULES', () => {
  it('names requests, the module this platform is actually about', () => {
    // The Code panel installs the real `requests` through micropip and rewrites its
    // transport. A candidate list for this platform without it helps with nothing.
    expect(STDLIB_MODULES.map(m => m.name)).toContain('requests')
  })

  it('keeps os, whose exclusion upstream does not apply here', () => {
    // The upstream list drops `os` because it misbehaves in that environment. The Code
    // panel runs on its own Pyodide with a working virtual filesystem.
    expect(STDLIB_MODULES.map(m => m.name)).toContain('os')
  })

  it('has no duplicate module entries', () => {
    const names = STDLIB_MODULES.map(m => m.name)
    expect(names).toEqual([...new Set(names)])
  })

  it('lists no symbol twice within one module', () => {
    for (const mod of STDLIB_MODULES) {
      const symbols = [...mod.functions, ...mod.variables]
      expect(symbols, `duplicate symbol in ${mod.name}`).toEqual([...new Set(symbols)])
    }
  })
})

describe('pythonStdlibCompletions', () => {
  it('offers every module name itself', () => {
    const labels = options().filter(o => o.type === 'namespace').map(o => o.label)
    expect(labels.sort()).toEqual(STDLIB_MODULES.map(m => m.name).sort())
  })

  it('tags every symbol with the module it came from', () => {
    // Indexed by (label, detail) rather than label alone: a symbol name is not unique
    // across modules — `request` is a function of `requests` and a submodule of
    // `urllib`, and `new` belongs to both `hashlib` and `hmac`. A label-keyed lookup
    // silently keeps whichever entry was built last and then reports the other module
    // as mislabelled, which is what the first version of this test did.
    const pairs = new Set(
      options().filter(o => o.type !== 'namespace').map(o => `${o.detail}\u0000${o.label}`),
    )
    for (const mod of STDLIB_MODULES) {
      for (const symbol of [...mod.functions, ...mod.variables]) {
        expect(
          pairs.has(`${mod.name}\u0000${symbol}`),
          `${mod.name}.${symbol} is not offered under its own module`,
        ).toBe(true)
      }
    }
  })

  it('never offers a symbol whose detail names a module that does not list it', () => {
    const listed = new Set(
      STDLIB_MODULES.flatMap(m => [...m.functions, ...m.variables].map(s => `${m.name}\u0000${s}`)),
    )
    for (const option of options().filter(o => o.type !== 'namespace')) {
      expect(
        listed.has(`${option.detail}\u0000${option.label}`),
        `${String(option.detail)}.${option.label} is offered but not listed`,
      ).toBe(true)
    }
  })

  it('returns nothing when there is no word to complete', () => {
    expect(pythonStdlibCompletions()(contextAt(null))).toBeNull()
  })

  it('anchors the completion at the start of the typed word', () => {
    const result = pythonStdlibCompletions()(contextAt({ from: 7, to: 9, text: 'ma' }))
    expect(result?.from).toBe(7)
  })
})
