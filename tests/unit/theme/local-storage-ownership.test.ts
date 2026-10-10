import { describe, it, expect, afterEach, vi } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  isOwnedLocalStorageKey,
  isClearableLocalStorageKey,
  listOwnedLocalStorageKeys,
  listClearableLocalStorageKeys,
  listLearnerEvidenceKeys,
  provesLearnerActed,
  OWNED_LOCAL_STORAGE_KEYS,
  REPEATER_SNAPSHOTS_DEFAULT,
  type OwnedKey,
} from '../../../.vitepress/theme/composables/localStorageKeys'
import {
  useEditorSettings,
  DEFAULT_EDITOR_SETTINGS,
  _resetEditorSettingsForTests,
} from '../../../.vitepress/theme/composables/useEditorSettings'
import {
  useSourceViewerSettings,
  DEFAULT_SOURCE_VIEWER_SETTINGS,
  _resetSourceViewerSettingsForTests,
} from '../../../.vitepress/theme/composables/useSourceViewerSettings'

/**
 * The shared-machine gate deletes every localStorage key this platform wrote. It can
 * only do that if it knows about all of them, and the failure mode when it does not is
 * silent: the key simply stays, and the next learner at that machine inherits it.
 *
 * That already happened once. The list was written when the platform had two keys; two
 * more were added later — the editor settings and the saved Repeater requests — and no
 * test, type or gate noticed. The Repeater snapshots are the learner's own attack work.
 *
 * So this test does not check the list against itself. It reads the theme source, pulls
 * out every localStorage key it can see being written, and asks the list about each
 * one. It fails on code the list's author never saw, which is the only kind of failure
 * worth catching here.
 */
const THEME = join(process.cwd(), '.vitepress/theme')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|vue)$/.test(entry) ? [path] : []
  })
}

/**
 * The key each localStorage write uses, as a pattern.
 *
 * Three spellings appear in this theme, and all three have to be read or the scan
 * reports zero keys and passes:
 *
 *   localStorage.setItem('literal', …)
 *   useLocalStorage(SOME_KEY, …)                 — @vueuse/core, writes to the same place
 *   useLocalStorage(`challenge-${slug}.…`, …)    — a per-challenge key
 *
 * An identifier is resolved against `const NAME = '…'` declarations anywhere in the
 * theme. A template literal keeps its fixed text and becomes `*` where it interpolates,
 * so `challenge-${slug}.localhost:repeater-snapshots` is checked as
 * `challenge-*.localhost:repeater-snapshots` — which the matcher for that key has to
 * recognise. It does, because it names both fixed ends and leaves the middle open. An
 * exact matcher would not recognise it at all; one anchored at the tail alone would
 * recognise it for the wrong reason, and every foreign key ending the same way with it.
 */
function constantValues(files: string[]): Map<string, string> {
  const consts = new Map<string, string>()
  for (const file of files) {
    const source = readFileSync(file, 'utf8')
    for (const m of source.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])((?:\\.|(?!\2).)*)\2/g)) {
      consts.set(m[1], m[3])
    }
  }
  return consts
}

function writtenKeys(source: string, consts: Map<string, string>): string[] {
  const found: string[] = []
  // The optional `<Type>` is not decoration: both settings composables call
  // `useLocalStorage<Settings>(KEY, …)`, and a pattern without it silently matched
  // neither — the first version of this scan reported only the one key that happens
  // to be written without a type argument.
  const call = /(?:localStorage\.setItem|useLocalStorage(?:<[^>]*>)?)\s*\(\s*([^,)]+)/g
  for (const m of source.matchAll(call)) {
    const arg = m[1].trim()
    const quoted = /^(['"`])((?:\\.|(?!\1).)*)\1$/.exec(arg)
    if (quoted) {
      found.push(quoted[1] === '`' ? quoted[2].replace(/\$\{[^}]*\}/g, '*') : quoted[2])
      continue
    }
    const resolved = consts.get(arg)
    if (resolved !== undefined) found.push(resolved)
  }
  return found
}

describe('localStorage ownership', () => {
  const files = sourceFiles(THEME)
  const consts = constantValues(files)

  it('finds the keys it is supposed to be scanning for', () => {
    // Without this, a scanner whose regex stopped matching would report zero keys and
    // pass — the shape of "green because it looked at nothing".
    const all = files.flatMap(f => writtenKeys(readFileSync(f, 'utf8'), consts))
    expect(all.length).toBeGreaterThan(0)
    expect(all).toContain('wxl:editor-settings')
    expect(all).toContain('challenge-*.localhost:repeater-snapshots')
  })

  it('every key the theme writes is one the platform claims', () => {
    const unclaimed: string[] = []
    for (const file of files) {
      // The list itself declares the keys; scanning it would be scanning the answer.
      if (file.endsWith('localStorageKeys.ts')) continue
      for (const key of writtenKeys(readFileSync(file, 'utf8'), consts)) {
        if (!isOwnedLocalStorageKey(key)) unclaimed.push(`${file.replace(process.cwd() + '/', '')}: ${key}`)
      }
    }
    // A key here is one the shared-machine clear would leave behind. Either add it to
    // OWNED_LOCAL_STORAGE_KEYS, or say in a comment beside it why it belongs to
    // somebody else.
    expect(unclaimed).toEqual([])
  })

  it('does not claim keys another package owns', () => {
    // VitePress's own. Clearing it would reach outside what this platform wrote.
    expect(isOwnedLocalStorageKey('vitepress-theme-appearance')).toBe(false)
    expect(isOwnedLocalStorageKey('some-other-site-key')).toBe(false)
  })

  it('does not claim a key just because it ends the way its own keys end', () => {
    // The two names above are hand-picked and neither ends in a tail this platform
    // uses, so they pass against a matcher anchored at one end only. These do not.
    // A tail says what a value holds; who wrote it is in the head.
    expect(isOwnedLocalStorageKey('analytics-widget:repeater-snapshots')).toBe(false)
    expect(isOwnedLocalStorageKey(':repeater-snapshots')).toBe(false)
    expect(isOwnedLocalStorageKey('elsewhere.localhost:repeater-snapshots')).toBe(false)
    // And not by its head alone either: `challenge-` is this platform's, but what a
    // challenge-scoped key holds is decided by the tail.
    expect(isOwnedLocalStorageKey('challenge-door-is-open.localhost:some-other-app')).toBe(false)
  })

  it("claims the per-challenge Repeater key in every form, the scan's included", () => {
    expect(isOwnedLocalStorageKey('challenge-door-is-open.localhost:repeater-snapshots')).toBe(true)
    // The form the scan above produces, with `${slug}` replaced by `*`. Anchoring the
    // head must not put the scan's own key out of reach: if this goes red, `every key
    // the theme writes is one the platform claims` goes red with it and the platform
    // has stopped recognising a key it writes itself.
    expect(isOwnedLocalStorageKey('challenge-*.localhost:repeater-snapshots')).toBe(true)
  })

  it('matches the per-challenge keys whatever the challenge is called', () => {
    expect(isOwnedLocalStorageKey('pentest-draft-door-is-open')).toBe(true)
    expect(isOwnedLocalStorageKey('pentest-draft-a-slug-nobody-has-written-yet')).toBe(true)
    expect(isOwnedLocalStorageKey('challenge-door-is-open.localhost:repeater-snapshots')).toBe(true)
    expect(isOwnedLocalStorageKey('challenge-anything.localhost:repeater-snapshots')).toBe(true)
  })
})

/**
 * What a key's presence proves, which is not the same question as who wrote it.
 *
 * The clear asks "did this platform write it" and must remove every key it did, because
 * residue is residue. The gate asks "did a LEARNER do something here", and a key the
 * platform writes by itself answers no to that. Reading one answer for both is what asked
 * a brand-new visitor, on a machine holding nothing, whose saved work this browser held.
 *
 * These tests pin each declared default to the code that actually writes it. A declared
 * default that drifts from its writer turns a key the platform planted into evidence of a
 * learner — silently, and in the direction that asks.
 */
describe('what a key presence proves', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    _resetEditorSettingsForTests()
    _resetSourceViewerSettingsForTests()
  })

  it('every claimed key declares what its presence proves', () => {
    // A key added to the list without a decision about the second question would inherit
    // whichever answer the code fell through to — and which one that is decides whether
    // the new key can hide a learner's work or raise a false alarm on an empty machine.
    for (const matcher of OWNED_LOCAL_STORAGE_KEYS) {
      expect(
        ['learner-acted', 'nothing', 'only-if-changed'],
        JSON.stringify(matcher),
      ).toContain(matcher.presence.proves)
    }
  })

  /**
   * The value the list DECLARES the platform plants under `key`.
   *
   * Read out of the declaration rather than recomputed, so the tests below compare what
   * the gate will actually compare against. A test that recomputed `JSON.stringify(...)`
   * would agree with itself while the declaration drifted.
   */
  function declaredDefault(key: string): string {
    const matcher = OWNED_LOCAL_STORAGE_KEYS.find(
      m => (m.kind === 'exact' && m.value === key) || (m.kind === 'bracketed' && key.endsWith(m.suffix)),
    )
    expect(matcher, `no owned matcher declares ${key}`).toBeDefined()
    expect(matcher!.presence.proves, key).toBe('only-if-changed')
    return (matcher!.presence as { proves: 'only-if-changed'; writtenDefault: string }).writtenDefault
  }

  it('the declared editor-settings default is what the composable actually writes', () => {
    // `useLocalStorage` writes its default the moment the composable runs. The assertion
    // is on the stored BYTES, because that is what the detection comparison reads — and
    // against the DECLARED default, because a declaration that has drifted from its
    // writer turns a key the platform planted into evidence of a learner, silently, and
    // in the direction that asks.
    _resetEditorSettingsForTests()
    localStorage.clear()
    useEditorSettings()
    expect(localStorage.getItem('wxl:editor-settings')).toBe(declaredDefault('wxl:editor-settings'))
    // And the declaration is derived from the settings module, not transcribed from it.
    expect(declaredDefault('wxl:editor-settings')).toBe(JSON.stringify(DEFAULT_EDITOR_SETTINGS))
  })

  it('the declared source-viewer default is what the composable actually writes', () => {
    _resetSourceViewerSettingsForTests()
    localStorage.clear()
    useSourceViewerSettings()
    expect(localStorage.getItem('wxl:source-viewer-settings')).toBe(declaredDefault('wxl:source-viewer-settings'))
    expect(declaredDefault('wxl:source-viewer-settings')).toBe(JSON.stringify(DEFAULT_SOURCE_VIEWER_SETTINGS))
  })

  it('the declared Repeater default is the literal RepeatPanel.vue passes', () => {
    // That literal lives in a `<script setup>` block, which exports nothing, so the
    // constant here is a restatement of it. This is what stops the restatement drifting:
    // it reads the call site rather than trusting it.
    const source = readFileSync(join(THEME, 'components/RepeatPanel.vue'), 'utf8')
    const call = /useLocalStorage\(\s*`[^`]*repeater-snapshots`\s*,\s*(['"])((?:\\.|(?!\1).)*)\1\s*\)/.exec(source)
    expect(call, 'RepeatPanel.vue no longer passes a string literal default for the Repeater key').not.toBeNull()
    expect(call![2]).toBe(REPEATER_SNAPSHOTS_DEFAULT)
    // And the constant is what the list declares, not merely a matching constant nobody
    // reads: the gate compares against the declaration.
    expect(declaredDefault('challenge-door-is-open.localhost:repeater-snapshots')).toBe(REPEATER_SNAPSHOTS_DEFAULT)
  })

  it('a key the platform writes by itself is not evidence of a learner', () => {
    // Measured: the locale is written from `enhanceApp` on every cold load of a localised
    // path, before this gate looks; the other three are written at panel setup, at their
    // defaults, and two of those panels are `v-show` rather than `v-if`.
    expect(provesLearnerActed('wxl-locale', 'zh-TW')).toBe(false)
    expect(provesLearnerActed('wxl:editor-settings', JSON.stringify(DEFAULT_EDITOR_SETTINGS))).toBe(false)
    expect(provesLearnerActed('wxl:source-viewer-settings', JSON.stringify(DEFAULT_SOURCE_VIEWER_SETTINGS))).toBe(false)
    expect(provesLearnerActed('challenge-door-is-open.localhost:repeater-snapshots', REPEATER_SNAPSHOTS_DEFAULT)).toBe(false)
  })

  it('a value that is not the written default is evidence of a learner', () => {
    // The boundary, one case either side of it. Note drafts have no default to be either
    // side of: nothing in this platform writes that key at all, so anything under it was
    // typed by somebody.
    expect(provesLearnerActed('wxl:editor-settings', JSON.stringify({ ...DEFAULT_EDITOR_SETTINGS, fontSize: 18 }))).toBe(true)
    expect(provesLearnerActed('challenge-door-is-open.localhost:repeater-snapshots', '[{"name":"admin bypass"}]')).toBe(true)
    expect(provesLearnerActed('pentest-draft-door-is-open', 'my notes')).toBe(true)
    // A key listed and then gone is unknown, and unknown asks rather than skips.
    expect(provesLearnerActed('challenge-door-is-open.localhost:repeater-snapshots', null)).toBe(true)
  })

  it('a key nobody here wrote proves nothing, whatever it holds', () => {
    expect(provesLearnerActed('vitepress-theme-appearance', 'dark')).toBe(false)
    expect(provesLearnerActed('analytics-widget:repeater-snapshots', '[{"a":1}]')).toBe(false)
  })

  it('claims for clearing what it does not count as evidence', () => {
    // The narrow question must not narrow the wide one. Residue is residue: the previous
    // learner's locale and panel state go, whether or not anybody chose their contents.
    for (const key of ['wxl-locale', 'wxl:editor-settings', 'wxl:source-viewer-settings']) {
      expect(isOwnedLocalStorageKey(key), key).toBe(true)
    }
    expect(provesLearnerActed('wxl-locale', 'zh-TW')).toBe(false)
  })

  it('lists as evidence only the keys whose presence proves a learner acted', () => {
    // The exact state a fresh browser reaches by cold-loading one challenge page under a
    // localised path: four owned keys, every one written by the platform, none of them
    // anybody's work. The wide list sees four; the narrow one must see none.
    localStorage.setItem('wxl-locale', 'zh-TW')
    localStorage.setItem('challenge-door-is-open.localhost:repeater-snapshots', REPEATER_SNAPSHOTS_DEFAULT)
    localStorage.setItem('wxl:editor-settings', JSON.stringify(DEFAULT_EDITOR_SETTINGS))
    localStorage.setItem('wxl:source-viewer-settings', JSON.stringify(DEFAULT_SOURCE_VIEWER_SETTINGS))

    expect(listOwnedLocalStorageKeys()).toHaveLength(4)
    expect(listLearnerEvidenceKeys()).toEqual([])

    // One saved request, and the same key becomes evidence.
    localStorage.setItem('challenge-door-is-open.localhost:repeater-snapshots', '[{"name":"admin bypass"}]')
    expect(listLearnerEvidenceKeys()).toEqual(['challenge-door-is-open.localhost:repeater-snapshots'])
  })

  it('lets a localStorage that refuses to be read throw, on this side too', () => {
    // Same policy as the ownership walk, for the same reason: an empty list here is the
    // claim that this machine holds nothing of the previous learner's, and that is the
    // one answer that hands their work to the next person.
    vi.stubGlobal('localStorage', {
      get length(): number { throw new Error('SecurityError: access denied') },
      key: () => null,
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    })

    expect(() => listLearnerEvidenceKeys()).toThrow(/SecurityError/)
  })
})

/**
 * The list, asked of the store rather than of one key at a time. The gate needs both
 * halves of it: what is here now (so it can ask before deleting), and what to delete.
 * One function, so the two cannot answer differently.
 */
describe('listOwnedLocalStorageKeys', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it("lists this platform's keys and leaves everyone else's where they are", () => {
    localStorage.setItem('wxl-locale', 'zh-TW')
    localStorage.setItem('pentest-draft-door-is-open', 'my notes')
    localStorage.setItem('challenge-door-is-open.localhost:repeater-snapshots', '[]')
    // Not ours: VitePress's own, and a key that merely ends the way ours ends.
    localStorage.setItem('vitepress-theme-appearance', 'dark')
    localStorage.setItem('analytics-widget:repeater-snapshots', 'somebody else')

    expect(listOwnedLocalStorageKeys().sort()).toEqual([
      'challenge-door-is-open.localhost:repeater-snapshots',
      'pentest-draft-door-is-open',
      'wxl-locale',
    ])
  })

  it('reads, and removes nothing', () => {
    // Collecting before removing is the caller's business, and it only works if
    // asking the question leaves the store as it found it.
    localStorage.setItem('wxl-locale', 'zh-TW')
    localStorage.setItem('pentest-draft-door-is-open', 'my notes')

    listOwnedLocalStorageKeys()

    expect(localStorage.getItem('wxl-locale')).toBe('zh-TW')
    expect(localStorage.getItem('pentest-draft-door-is-open')).toBe('my notes')
  })

  it('lets a localStorage that refuses to be read throw', () => {
    // Unreadable is unknown, not empty. Returning an empty list here would tell the
    // gate that this machine holds nothing, which is exactly the answer that hands the
    // previous learner's work to the next person. The caller decides what to do with
    // the failure; this function does not decide it for them by hiding it.
    vi.stubGlobal('localStorage', {
      get length(): number { throw new Error('SecurityError: access denied') },
      key: () => null,
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    })

    expect(() => listOwnedLocalStorageKeys()).toThrow(/SecurityError/)
  })
})

/**
 * What clearing does with a key, which is a third question and not either of the first two.
 *
 * Ownership asks who wrote the key; presence asks what its being here proves about the
 * learner. Neither answers whether the clear should take it. The locale preference is the
 * one key where those come apart: the platform writes it on every cold load of a
 * localised path AND the learner writes it by picking a language, and nothing in the
 * stored value tells the two apart. Removing it starts the next learner in a language
 * nobody chose; keeping it is a deliberate, declared exemption rather than a key the list
 * forgot.
 */
describe('what clearing does with a key', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('every claimed key declares whether clearing removes it', () => {
    // Same shape as the presence declaration, for the same reason: a key added without a
    // decision would inherit whichever answer the code fell through to, and which one it
    // fell to decides between leaving the previous learner's residue behind and wiping
    // something this platform promised to keep.
    for (const matcher of OWNED_LOCAL_STORAGE_KEYS) {
      expect(['remove', 'exempt'], JSON.stringify(matcher)).toContain(matcher.clearing)
    }
  })

  it('a declaration without a clearing disposition does not compile', () => {
    // The compile-time half of the rule above. If `clearing` ever becomes optional this
    // directive goes unused, and an unused `@ts-expect-error` is itself a type error — so
    // the typecheck fails either way round, which is the point.
    // @ts-expect-error - `clearing` is required on every declaration
    const undeclared: OwnedKey = { kind: 'exact', value: 'wxl-nothing', presence: { proves: 'nothing' } }
    expect(undeclared.kind).toBe('exact')
  })

  it('the locale preference is the only key exempt from clearing', () => {
    const exempt = OWNED_LOCAL_STORAGE_KEYS.filter(m => m.clearing === 'exempt')
    expect(exempt).toHaveLength(1)
    expect(exempt[0]).toMatchObject({ kind: 'exact', value: 'wxl-locale' })
  })

  it('clearing takes every key the platform wrote except the exempt one', () => {
    expect(isClearableLocalStorageKey('wxl-locale')).toBe(false)
    for (const key of [
      'wxl:editor-settings',
      'wxl:source-viewer-settings',
      'pentest-draft-door-is-open',
      'challenge-door-is-open.localhost:repeater-snapshots',
    ]) {
      expect(isClearableLocalStorageKey(key), key).toBe(true)
    }
  })

  it('does not offer to clear a key another package owns', () => {
    // The narrow question must not widen the wide one either. Everything ownership
    // refuses, clearing refuses.
    expect(isClearableLocalStorageKey('vitepress-theme-appearance')).toBe(false)
    expect(isClearableLocalStorageKey('analytics-widget:repeater-snapshots')).toBe(false)
    expect(isClearableLocalStorageKey('elsewhere.localhost:repeater-snapshots')).toBe(false)
  })

  it('still claims the exempt key as one this platform wrote', () => {
    // Ownership is unchanged by the exemption. The scan that reads the theme source asks
    // this question, so dropping the locale out of the list to exempt it would take the
    // key out from under the check that notices when a key stops being declared.
    expect(isOwnedLocalStorageKey('wxl-locale')).toBe(true)
  })

  it('lists for clearing what ownership lists, minus the exempt key', () => {
    localStorage.setItem('wxl-locale', 'zh-TW')
    localStorage.setItem('pentest-draft-door-is-open', 'my notes')
    localStorage.setItem('challenge-door-is-open.localhost:repeater-snapshots', '[{"name":"admin bypass"}]')
    localStorage.setItem('vitepress-theme-appearance', 'dark')

    expect(listOwnedLocalStorageKeys().sort()).toEqual([
      'challenge-door-is-open.localhost:repeater-snapshots',
      'pentest-draft-door-is-open',
      'wxl-locale',
    ])
    expect(listClearableLocalStorageKeys().sort()).toEqual([
      'challenge-door-is-open.localhost:repeater-snapshots',
      'pentest-draft-door-is-open',
    ])
  })

  it('never counts an exempt key as evidence a learner acted', () => {
    // The invariant that keeps the gate honest: it must not ask about work it has
    // undertaken not to remove. Checked over the list rather than over one key, so a
    // second exemption added later cannot quietly break it.
    for (const matcher of OWNED_LOCAL_STORAGE_KEYS.filter(m => m.clearing === 'exempt')) {
      const key = matcher.kind === 'exact' ? matcher.value
        : matcher.kind === 'prefix' ? `${matcher.value}door-is-open`
          : `${matcher.prefix}door-is-open${matcher.suffix}`
      for (const value of ['zh-TW', 'en', 'a value no platform write produces', null]) {
        expect(provesLearnerActed(key, value), `${key} = ${value}`).toBe(false)
      }
    }
  })

  it('lets a localStorage that refuses to be read throw, on the clearing side too', () => {
    // Same policy as the other two walks. An empty list here would report a machine as
    // cleared while an unknown amount of the previous learner's data is still on it.
    vi.stubGlobal('localStorage', {
      get length(): number { throw new Error('SecurityError: access denied') },
      key: () => null,
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    })

    expect(() => listClearableLocalStorageKeys()).toThrow(/SecurityError/)
  })
})
