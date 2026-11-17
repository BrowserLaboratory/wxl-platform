import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, statSync, unlinkSync } from 'node:fs'
import { tmpdir, platform } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { classifySourcePath, checkSourceLayout } from '../../../.vitepress/source-layout'
import { SiteLayoutError } from '../../../.vitepress/layout-error'
import {
  upstreamOnlySkipReason,
  readManifest,
  isGitWorkTree,
  hasRootRangeJson,
} from '../../__helpers__/upstreamDecision'

// 0010-S2 working test: claims no row (U136 compares `classifySourcePath` with create-wxl's
// `isLegacyPage` in T-0077). Every path classifies the same for both primaries.

const OUTSIDE = [
  'index.md',
  'challenges.md',
  'x.md',
  'guide/x.md',
  'reference/x.md',
  'ja/index.md',
  'fr/a.md',
  'zh-tw/index.md',
  'EN/index.md',
  'ZH-TW/x.md',
  'docs/a.md',
  'challenge/x/index.md',
  'challenge/x.md',
  'challenge/x/notes.md',
  'challenge/x/sub/a.md',
  'challenge/src/a.md',
  'challenge/index.md',
]

const EXCLUDED = [
  'challenge/x/src/README.md',
  'challenge/x/src/a/b/c.md',
  'public/x.md',
  'shared/x.md',
  '.draft.md',
  'en/.x/a.md',
  'node_modules/p/README.md',
  'en/dist/old.md',
  'foo.txt',
  'assets/logo.png',
  'postcss.config.mjs',
  'README.MD',
  'x.Md',
  'x.MD',
]

const LOCALE_PAGE = ['en/x.md', 'zh-TW/x.md', 'zh-TW/en/a.md', 'en/smoke-fixtures/english-only.md']

describe('classifySourcePath (0010-S2 working test)', () => {
  for (const primary of ['en', 'zh-TW'] as const) {
    describe(`primary = ${primary}`, () => {
      it.each(OUTSIDE)('%s is outside', (path) => {
        expect(classifySourcePath(path, primary)).toBe('outside')
      })

      it.each(EXCLUDED)('%s is excluded', (path) => {
        expect(classifySourcePath(path, primary)).toBe('excluded')
      })

      it.each(LOCALE_PAGE)('%s is a locale page', (path) => {
        expect(classifySourcePath(path, primary)).toBe('locale-page')
      })
    })
  }
})

// ─── U136 / D116: the table shared with create-wxl ──────────────────────────────────────────────
// `create-wxl/` is not in a range (.gitattributes: /create-wxl export-ignore), so this half is
// upstream-only, declared through D124's helper (never an existsSync check, so a deleted file
// cannot skip silently: on upstream `WXL_EXPECT_UPSTREAM` guards the decision).

const ROOT = resolve(__dirname, '../../..')
const PREDICATE_TABLE = resolve(ROOT, 'create-wxl/test/fixtures/page-predicate.json')
const U136_SKIP = upstreamOnlySkipReason(
  process.env.GITHUB_REPOSITORY,
  readManifest(ROOT),
  isGitWorkTree(ROOT),
  hasRootRangeJson(ROOT),
)

// Read here, behind the same decision: vitest runs a skipped describe's factory at collection, so a
// readFileSync inside it would fail the whole file in a range (no `create-wxl/`). On upstream a
// missing table still throws (ENOENT), never skips.
const PREDICATE_ROWS: Array<{ path: string; class: string }> =
  U136_SKIP === undefined ? JSON.parse(readFileSync(PREDICATE_TABLE, 'utf8')) : []

describe.skipIf(U136_SKIP !== undefined)('U136: classifySourcePath over the table shared with create-wxl (D116)', () => {
  const rows = PREDICATE_ROWS.filter((row) => row.class !== 'not-source')

  it('runs a non-empty set of rows, each a platform/ path', () => {
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.path.startsWith('platform/')).toBe(true)
  })

  for (const primary of ['en', 'zh-TW'] as const) {
    describe(`primary = ${primary}`, () => {
      it.each(rows.map((row) => [row.path, row.class]))('%s is %s', (path, cls) => {
        expect(classifySourcePath(path.slice('platform/'.length), primary)).toBe(cls)
      })
    })
  }
})

// ─── checkSourceLayout (B20–B36, B91) ───────────────────────────────────────────────────────────

const tempDirs: string[] = []
afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** The valid new-layout tree of the "Layout check" preamble (traceability.md revision 2.3). */
const VALID_FILES = [
  'en/index.md',
  'zh-TW/index.md',
  'challenge/x/challenge.yaml',
  'challenge/x/src/app.py',
  'public/favicon.svg',
  'shared/challenges.data.ts',
  'postcss.config.mjs',
]

function fixtureTree(files: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'wxl-layout-'))
  tempDirs.push(root)
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), '# page\n')
  }
  return root
}

function errorOf(fn: () => void): SiteLayoutError {
  try {
    fn()
  } catch (err) {
    return err as SiteLayoutError
  }
  throw new Error('expected checkSourceLayout to throw')
}

function pathLines(error: SiteLayoutError): string[] {
  return error.message.split('\n').slice(1).map((line) => line.trim())
}

/** Probes the temporary volume for case-insensitivity, in a directory of its own (U55's pattern,
 *  create-wxl/test/upgrade-aliases.test.mjs `isCaseInsensitive`). */
function isCaseInsensitiveFs(): boolean {
  const dir = mkdtempSync(join(tmpdir(), 'wxl-case-probe-'))
  try {
    writeFileSync(join(dir, 'CaseProbe.tmp'), 'x')
    try {
      statSync(join(dir, 'caseprobe.tmp'))
      return true
    } catch {
      return false
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('checkSourceLayout (0010-S2; B20–B36, B91)', () => {
  const BOTH: readonly ('en' | 'zh-TW')[] = ['en', 'zh-TW']

  describe('B20: a valid new layout passes', () => {
    it.each(BOTH)('returns for primary %s', (primary) => {
      const root = fixtureTree(VALID_FILES)
      expect(() => checkSourceLayout(root, primary)).not.toThrow()
    })

    it('returns with an empty zh-TW/ (primary en)', () => {
      const root = fixtureTree(VALID_FILES.filter((f) => f !== 'zh-TW/index.md'))
      mkdirSync(join(root, 'zh-TW'), { recursive: true })
      expect(() => checkSourceLayout(root, 'en')).not.toThrow()
    })

    it('returns with zh-TW/ absent (primary en)', () => {
      const root = fixtureTree(VALID_FILES.filter((f) => f !== 'zh-TW/index.md'))
      expect(() => checkSourceLayout(root, 'en')).not.toThrow()
    })

    it('returns with an empty en/ (primary zh-TW)', () => {
      const root = fixtureTree(VALID_FILES.filter((f) => f !== 'en/index.md'))
      mkdirSync(join(root, 'en'), { recursive: true })
      expect(() => checkSourceLayout(root, 'zh-TW')).not.toThrow()
    })

    it('returns with en/ absent (primary zh-TW)', () => {
      const root = fixtureTree(VALID_FILES.filter((f) => f !== 'en/index.md'))
      expect(() => checkSourceLayout(root, 'zh-TW')).not.toThrow()
    })
  })

  describe('B21: pages directly in platform/', () => {
    it.each(BOTH)('lists platform/challenges.md then platform/index.md (primary %s)', (primary) => {
      const root = fixtureTree([...VALID_FILES, 'index.md', 'challenges.md'])
      const error = errorOf(() => checkSourceLayout(root, primary))
      expect(error.code).toBe('PL-E08')
      expect(pathLines(error)).toEqual(['"platform/challenges.md"', '"platform/index.md"'])
    })
  })

  describe('B22: pages in an unlisted top folder', () => {
    const SIMPLE = ['guide/x.md', 'reference/x.md', 'ja/index.md', 'fr/a.md', 'docs/a.md']

    it.each(SIMPLE)('%s is in the PL-E08 list', (path) => {
      const root = fixtureTree([...VALID_FILES, path])
      const error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E08')
      expect(pathLines(error)).toContain(`"platform/${path}"`)
    })

    it('zh-tw/index.md is in the PL-E08 list, in a tree with no zh-TW/', () => {
      if (isCaseInsensitiveFs()) {
        // zh-tw/ and zh-TW/ would collide on this filesystem (U55's pattern).
        return
      }
      const root = fixtureTree([
        'en/index.md',
        'challenge/x/challenge.yaml',
        'challenge/x/src/app.py',
        'public/favicon.svg',
        'shared/challenges.data.ts',
        'postcss.config.mjs',
        'zh-tw/index.md',
      ])
      const error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E08')
      expect(pathLines(error)).toContain('"platform/zh-tw/index.md"')
    })

    it('EN/index.md is in the PL-E08 list, in a tree with no en/', () => {
      if (isCaseInsensitiveFs()) {
        return
      }
      const root = fixtureTree([
        'zh-TW/index.md',
        'challenge/x/challenge.yaml',
        'challenge/x/src/app.py',
        'public/favicon.svg',
        'shared/challenges.data.ts',
        'postcss.config.mjs',
        'EN/index.md',
      ])
      const error = errorOf(() => checkSourceLayout(root, 'zh-TW'))
      expect(error.code).toBe('PL-E08')
      expect(pathLines(error)).toContain('"platform/EN/index.md"')
    })
  })

  describe('B23: pages under platform/challenge/ outside <slug>/src/', () => {
    const PATHS = ['challenge/x/index.md', 'challenge/x.md', 'challenge/x/notes.md', 'challenge/x/sub/a.md', 'challenge/src/a.md']

    it.each(PATHS)('%s is in the PL-E08 list', (path) => {
      const root = fixtureTree([...VALID_FILES, path])
      const error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E08')
      expect(pathLines(error)).toContain(`"platform/${path}"`)
    })
  })

  describe('B24: .md under challenge/<slug>/src/** is not a page', () => {
    it.each(BOTH)('returns, no error (primary %s)', (primary) => {
      const root = fixtureTree([...VALID_FILES, 'challenge/x/src/README.md', 'challenge/x/src/a/b/c.md'])
      expect(() => checkSourceLayout(root, primary)).not.toThrow()
    })
  })

  describe('B25: public/** and shared/** are not pages', () => {
    it.each(BOTH)('returns, no error (primary %s)', (primary) => {
      const root = fixtureTree([...VALID_FILES, 'public/x.md', 'shared/x.md'])
      expect(() => checkSourceLayout(root, primary)).not.toThrow()
    })
  })

  describe('B26: dot-prefixed, node_modules/ and dist/ are ignored at any depth', () => {
    it.each(BOTH)('returns, no error (primary %s)', (primary) => {
      const root = fixtureTree([
        ...VALID_FILES,
        '.draft.md',
        'en/.x/a.md',
        'node_modules/p/README.md',
        'en/dist/old.md',
      ])
      expect(() => checkSourceLayout(root, primary)).not.toThrow()
    })
  })

  describe('B27: non-.md files and folders holding no page are allowed', () => {
    it.each(BOTH)('returns, no error (primary %s)', (primary) => {
      const root = fixtureTree([...VALID_FILES, 'foo.txt', 'assets/logo.png'])
      mkdirSync(join(root, 'assets'), { recursive: true })
      mkdirSync(join(root, 'ja'), { recursive: true })
      expect(() => checkSourceLayout(root, primary)).not.toThrow()
    })
  })

  describe('B28: .MD and .Md are not pages', () => {
    it.each(BOTH)('returns, no error (primary %s)', (primary) => {
      const root = fixtureTree([...VALID_FILES, 'README.MD'])
      expect(() => checkSourceLayout(root, primary)).not.toThrow()
    })
  })

  describe('B29: the primary home page is missing', () => {
    it('PL-E10 when primary en/ is absent', () => {
      const root = fixtureTree(VALID_FILES.filter((f) => f !== 'en/index.md'))
      const error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E10')
      expect(error.message.split('\n')[0]).toBe(
        'PL-E10: the primary locale en has no home page: "platform/en/index.md" is missing.',
      )
    })

    it('PL-E10 when primary zh-TW/ is absent', () => {
      const root = fixtureTree(VALID_FILES.filter((f) => f !== 'zh-TW/index.md'))
      const error = errorOf(() => checkSourceLayout(root, 'zh-TW'))
      expect(error.code).toBe('PL-E10')
      expect(error.message.split('\n')[0]).toBe(
        'PL-E10: the primary locale zh-TW has no home page: "platform/zh-TW/index.md" is missing.',
      )
    })

    it('PL-E10 when the primary folder exists but index.md is absent', () => {
      const root = fixtureTree(VALID_FILES.filter((f) => f !== 'en/index.md'))
      mkdirSync(join(root, 'en'), { recursive: true })
      const error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E10')
    })

    it('PL-E10 when index.md is a directory, not a file', () => {
      const root = fixtureTree(VALID_FILES.filter((f) => f !== 'en/index.md'))
      mkdirSync(join(root, 'en', 'index.md'), { recursive: true })
      const error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E10')
    })
  })

  describe('B30: a translation home may be missing', () => {
    it('no error (primary zh-TW, en/guide/a.md present, en/index.md absent)', () => {
      const root = fixtureTree([...VALID_FILES.filter((f) => f !== 'en/index.md'), 'en/guide/a.md'])
      expect(() => checkSourceLayout(root, 'zh-TW')).not.toThrow()
    })
  })

  describe('B31: direct entries named like a listed locale', () => {
    it.each(['zh-TW/en/a.md', 'zh-TW/zh-TW/a.md', 'en/en.md', 'zh-TW/en.md', 'en/zh-TW.md'])(
      '%s is in the PL-E09 list, for every primary',
      (path) => {
        for (const primary of BOTH) {
          const root = fixtureTree([...VALID_FILES, path])
          const error = errorOf(() => checkSourceLayout(root, primary))
          expect(error.code).toBe('PL-E09')
          expect(pathLines(error)).toContain(`"platform/${path}"`)
        }
      },
    )

    it('en/zh-TW/ (an empty folder) is in the PL-E09 list, for every primary', () => {
      for (const primary of BOTH) {
        const root = fixtureTree(VALID_FILES)
        mkdirSync(join(root, 'en', 'zh-TW'), { recursive: true })
        const error = errorOf(() => checkSourceLayout(root, primary))
        expect(error.code).toBe('PL-E09')
        expect(pathLines(error)).toContain('"platform/en/zh-TW/"')
      }
    })
  })

  describe('B32: deeper or unlisted-code entries are allowed', () => {
    it.each(BOTH)('returns, no error (primary %s)', (primary) => {
      const root = fixtureTree([...VALID_FILES, 'zh-TW/ja/a.md', 'en/guide/zh-TW/a.md'])
      expect(() => checkSourceLayout(root, primary)).not.toThrow()
    })
  })

  describe.skipIf(platform() === 'win32')('B33: symbolic links in the searched area', () => {
    it('platform/en (a folder) is in the PL-E07 list, and the walk does not descend into it', () => {
      const root = fixtureTree(['zh-TW/index.md', 'challenge/x/challenge.yaml', 'challenge/x/src/app.py'])
      mkdirSync(join(root, 'en-real'), { recursive: true })
      writeFileSync(join(root, 'en-real', 'index.md'), '# page\n')
      writeFileSync(join(root, 'en-real', 'should-not-be-seen.md'), '# page\n')
      symlinkSync(join(root, 'en-real'), join(root, 'en'), 'dir')
      const error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E07')
      expect(pathLines(error)).toEqual(['"platform/en"'])
    })

    it('platform/zh-TW/guide/a.md (a file) is in the PL-E07 list', () => {
      const root = fixtureTree(VALID_FILES)
      const outside = mkdtempSync(join(tmpdir(), 'wxl-layout-target-'))
      tempDirs.push(outside)
      writeFileSync(join(outside, 'real-a.md'), '# page\n')
      mkdirSync(join(root, 'zh-TW', 'guide'), { recursive: true })
      symlinkSync(join(outside, 'real-a.md'), join(root, 'zh-TW', 'guide', 'a.md'))
      const error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E07')
      expect(pathLines(error)).toContain('"platform/zh-TW/guide/a.md"')
    })

    it('platform/challenge/x/notes (a folder outside src/) is in the PL-E07 list', () => {
      const root = fixtureTree(VALID_FILES)
      mkdirSync(join(root, 'real-notes'), { recursive: true })
      symlinkSync(join(root, 'real-notes'), join(root, 'challenge', 'x', 'notes'), 'dir')
      const error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E07')
      expect(pathLines(error)).toContain('"platform/challenge/x/notes"')
    })
  })

  describe.skipIf(platform() === 'win32')('B34: symbolic links in excluded areas are not checked', () => {
    it('returns, no error', () => {
      const root = fixtureTree(VALID_FILES)
      const outside = mkdtempSync(join(tmpdir(), 'wxl-layout-target-'))
      tempDirs.push(outside)
      writeFileSync(join(outside, 'real.md'), '# page\n')
      symlinkSync(join(outside, 'real.md'), join(root, 'public', 'x'))
      symlinkSync(join(outside, 'real.md'), join(root, 'shared', 'x'))
      symlinkSync(join(outside, 'real.md'), join(root, 'challenge', 'x', 'src', 'y'))
      expect(() => checkSourceLayout(root, 'en')).not.toThrow()
    })
  })

  describe.skipIf(platform() === 'win32')('B35: only the first violated rule is reported', () => {
    it('reports PL-E07, then PL-E08, then PL-E10 as the tree is fixed up in sequence', () => {
      const root = fixtureTree(VALID_FILES.filter((f) => f !== 'en/index.md'))
      mkdirSync(join(root, 'real-link-target'), { recursive: true })
      symlinkSync(join(root, 'real-link-target'), join(root, 'linked'), 'dir')
      writeFileSync(join(root, 'outside.md'), '# page\n')

      let error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E07')

      unlinkSync(join(root, 'linked'))
      error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E08')

      rmSync(join(root, 'outside.md'))
      error = errorOf(() => checkSourceLayout(root, 'en'))
      expect(error.code).toBe('PL-E10')
    })
  })

  describe('B36: a translation-only page is allowed', () => {
    it('no error (primary en, zh-TW/guide/only.md)', () => {
      const root = fixtureTree([...VALID_FILES, 'zh-TW/guide/only.md'])
      expect(() => checkSourceLayout(root, 'en')).not.toThrow()
    })
  })

  describe.skipIf(platform() === 'win32')('B91: platform itself is a symbolic link', () => {
    it('throws PL-E07 with the list "platform"', () => {
      const real = fixtureTree(VALID_FILES)
      const linkDir = mkdtempSync(join(tmpdir(), 'wxl-layout-link-'))
      tempDirs.push(linkDir)
      const link = join(linkDir, 'platform-link')
      symlinkSync(real, link, 'dir')
      const error = errorOf(() => checkSourceLayout(link, 'en'))
      expect(error.code).toBe('PL-E07')
      expect(pathLines(error)).toEqual(['"platform"'])
    })
  })
})
