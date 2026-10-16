// Archive entry rules (traceability.md "Archive entry rules", rules 1-5) and strict parse (C55).
// Every fixture here is built with raw tar headers (test/helpers/archive.mjs), not the high-level
// pack API, since a hostile entry (a symlink, a path-traversal name, a collision) is exactly what
// this ticket needs the builder to produce. Never spells the upstream repository slug: everything
// is derived from `UPSTREAM_SLUG`/`FIXED_COMMIT`.

import { describe, it, expect } from 'vitest'
import { gzipSync } from 'node:zlib'
import { Pax } from 'tar'
import { readdir, rm, readFile, lstat } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { run } from '../src/run.mjs'
import { walkRawEntries } from '../src/raw-tar.mjs'
import { messages } from '../src/messages.mjs'
import { makeDeps, FIXED_COMMIT } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { buildArchiveRaw, pad512, headerBlock, paxExtendedHeaderBlock, gnuLongNameBlock } from './helpers/archive.mjs'
import { CHANGELOG_CONTENT, OPEN_QUESTIONS_CONTENT, PACKAGE_JSON_CONTENT } from './helpers/fixtures.mjs'
import { recordingFs } from './helpers/fs-recorder.mjs'
import { snapshotTree } from './helpers/snapshot.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { expectE08, expectE08CommentMarker } from './helpers/expect-codes.mjs'
import * as engineModule from '../../scripts/fork-init.ts'

const REPO_NAME = engineModule.UPSTREAM_SLUG.split('/')[1]
const PREFIX = `${REPO_NAME}-${FIXED_COMMIT}`

/** The valid part of every fixture in this file: the prefix directory and the P1-P3 files every
 * accepted archive needs (so an accepted case can run the whole `--no-setup` path, and a rejected
 * case proves the valid entries ahead of the violation were not written either). Entries beyond
 * these are each case's own (built with explicit, already-prefixed paths: `buildArchiveRaw` does
 * not prefix anything itself, unlike the happy-path `buildArchive`, so a case that needs an
 * entry WITHOUT the prefix -- rule 2's mismatched first component -- can ask for exactly that). */
function basePrefixedEntries() {
  return [
    { path: `${PREFIX}/`, type: 'dir', mode: 0o755 },
    { path: `${PREFIX}/CHANGELOG.md`, type: 'file', mode: 0o644, content: CHANGELOG_CONTENT },
    { path: `${PREFIX}/.proj.specs/`, type: 'dir', mode: 0o755 },
    { path: `${PREFIX}/.proj.specs/OPEN-QUESTIONS.md`, type: 'file', mode: 0o644, content: OPEN_QUESTIONS_CONTENT },
    { path: `${PREFIX}/package.json`, type: 'file', mode: 0o644, content: PACKAGE_JSON_CONTENT },
  ]
}

function buildFixtureArchive(extraEntries, { comment = FIXED_COMMIT } = {}) {
  return gzipSync(buildArchiveRaw([...basePrefixedEntries(), ...extraEntries], { comment }))
}

async function runFixture(tmpRoot, body) {
  const target = join(tmpRoot, 'range')
  const before = await snapshotTree(tmpRoot)
  const { fs, calls } = recordingFs()
  const fetchArchive = async () => ({ status: 200, body })
  const deps = makeDeps({ env: { LANG: 'en_US' }, cwd: tmpRoot, fs, fetchArchive })
  const ioHelper = makeIo()
  const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)
  const after = await snapshotTree(tmpRoot)
  const mkdtempCalls = calls.filter((c) => c.method === 'mkdtemp')
  const parentNames = await readdir(dirname(target)).catch(() => [])
  return { exitCode, ioHelper, mkdtempCalls, calls, parentNames, target, before, after }
}

/** Common to every rejected case (D4/S-08, strengthened per finding S-05/P-05): CW-E08, `mkdtemp`
 * never called, NO write-type fs call happened at all, the target still does not exist, and the
 * whole parent tree is byte-for-byte as it was before the run (not just "no `.create-wxl-*`
 * directory appeared"). */
async function expectRejected({ exitCode, mkdtempCalls, calls, parentNames, target, before, after }) {
  expect(exitCode).toBe(1)
  expect(mkdtempCalls).toEqual([])
  expect(calls).toEqual([])
  expect(parentNames.some((n) => n.startsWith('.create-wxl-'))).toBe(false)
  await expect(lstat(target)).rejects.toMatchObject({ code: 'ENOENT' })
  expect(after).toEqual(before)
}

describe('entry rules', () => {
  describe('rule 1: entry types', () => {
    it.each([
      ['symlink', { path: `${PREFIX}/evil`, type: 'symlink', mode: 0o644, linkpath: 'package.json' }],
      ['hardlink', { path: `${PREFIX}/evil`, type: 'link', mode: 0o644, linkpath: 'package.json' }],
      ['FIFO', { path: `${PREFIX}/evil`, type: 'fifo', mode: 0o644 }],
      ['character device', { path: `${PREFIX}/evil`, type: 'char', mode: 0o644, devmajor: 1, devminor: 3 }],
      ['block device', { path: `${PREFIX}/evil`, type: 'block', mode: 0o644, devmajor: 8, devminor: 1 }],
      ['GNU sparse', { path: `${PREFIX}/evil`, type: 'sparse', mode: 0o644, content: '' }],
      ['unknown typeflag Z', { path: `${PREFIX}/evil`, type: 'unknown', mode: 0o644, content: '', rawTypeflag: 'Z' }],
    ])('%s -> CW-E08 naming rule 1 and the entry, nothing written', async (_label, hostileEntry) => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = buildFixtureArchive([hostileEntry])
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08(result.ioHelper.stderrText, 1, hostileEntry.path)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })
  })

  describe('rule 3: path shape (after the prefix)', () => {
    it.each([
      ['/abs', `${PREFIX}//abs`],
      ['../x', `${PREFIX}/../x`],
      ['a/../x', `${PREFIX}/a/../x`],
      ['a//b', `${PREFIX}/a//b`],
      ['./x', `${PREFIX}/./x`],
      ['a\\b', `${PREFIX}/a\\b`],
      ['.git/x', `${PREFIX}/.git/x`],
      ['.GIT/x', `${PREFIX}/.GIT/x`],
      ['a/x.', `${PREFIX}/a/x.`],
      ['a/x (trailing space)', `${PREFIX}/a/x `],
      // Empty content: `tar`'s own `Header.decode` reclassifies this as a directory and forces
      // its decoded size to 0 to match -- a non-empty body here would desync the parser's byte
      // offsets for every entry after it (S-19: the trap `raw-tar.mjs`'s own header comment
      // documents, and the "desync resistance" describe block below exercises on purpose), a
      // side effect of the trap, not something this one case is testing.
      ['a/ (type 0 file named like a directory)', `${PREFIX}/a/`, ''],
      ['name holding ESC', `${PREFIX}/a\u001bb`],
      ['DEL', `${PREFIX}/a\u007fb`],
      ['C1', `${PREFIX}/a\u0085b`],
    ])('%s -> CW-E08 naming rule 3 and the entry', async (_label, headerPath, content = 'x') => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = buildFixtureArchive([{ path: headerPath, type: 'file', mode: 0o644, content }])
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08(result.ioHelper.stderrText, 3, headerPath)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })

    // C-05: DEL and C1 (U+0080-U+009F) are exactly the two ranges `JSON.stringify` passes
    // through unescaped; asserted against the LITERAL `\uXXXX` text here, not through
    // production's own `jsonValue` (which the test above already uses for the general case --
    // calling it again here would only prove the test and the bug agree with each other).
    it.each([
      ['DEL', `${PREFIX}/a\u007fb`, '\\u007f'],
      ['C1', `${PREFIX}/a\u0085b`, '\\u0085'],
    ])('%s is escaped to the literal %s, not printed verbatim', async (_label, headerPath, literalEscape) => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = buildFixtureArchive([{ path: headerPath, type: 'file', mode: 0o644, content: 'x' }])
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expect(result.ioHelper.stderrText).toContain(literalEscape)
        expect(result.ioHelper.stderrText).not.toContain(headerPath)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })

    it('a path empty after the prefix -> CW-E08 naming rule 3', async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = gzipSync(
          buildArchiveRaw([...basePrefixedEntries(), { path: PREFIX, type: 'file', mode: 0o644, content: '' }], {
            comment: FIXED_COMMIT,
          }),
        )
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08(result.ioHelper.stderrText, 3, PREFIX)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })
  })

  describe('rule 2: first component and pax comment', () => {
    it('two different first components -> CW-E08 naming rule 2 and the rogue entry', async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = gzipSync(
          buildArchiveRaw([...basePrefixedEntries(), { path: 'other/b', type: 'file', mode: 0o644, content: 'x' }], {
            comment: FIXED_COMMIT,
          }),
        )
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08(result.ioHelper.stderrText, 2, 'other/b')
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })

    it('no pax global comment -> CW-E08 naming rule 2 and "pax comment"', async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = gzipSync(buildArchiveRaw(basePrefixedEntries(), {}))
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08CommentMarker(result.ioHelper.stderrText, 2)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })

    it('pax comment is another commit -> CW-E08 naming rule 2 and "pax comment"', async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = gzipSync(
          buildArchiveRaw(basePrefixedEntries(), { comment: 'abcdef0123456789abcdef0123456789abcdef01' }),
        )
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08CommentMarker(result.ioHelper.stderrText, 2)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })

    // C-01/C-11: step 8 joins `rest` under the first component unvalidated; a `\` there would be
    // the same path-shape hazard rule 3 already rejects for everything after it (and, on
    // Windows, could change which directory the write lands under).
    it('first component containing a backslash -> CW-E08 naming rule 2', async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const badPrefix = `${PREFIX}\\x`
        const body = gzipSync(
          buildArchiveRaw(
            [
              { path: `${badPrefix}/`, type: 'dir', mode: 0o755 },
              { path: `${badPrefix}/CHANGELOG.md`, type: 'file', mode: 0o644, content: CHANGELOG_CONTENT },
              { path: `${badPrefix}/.proj.specs/`, type: 'dir', mode: 0o755 },
              {
                path: `${badPrefix}/.proj.specs/OPEN-QUESTIONS.md`,
                type: 'file',
                mode: 0o644,
                content: OPEN_QUESTIONS_CONTENT,
              },
              { path: `${badPrefix}/package.json`, type: 'file', mode: 0o644, content: PACKAGE_JSON_CONTENT },
            ],
            { comment: FIXED_COMMIT },
          ),
        )
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08(result.ioHelper.stderrText, 2, `${badPrefix}/`)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })
  })

  describe('rules 4-5: collisions and at-least-one-file', () => {
    it.each([
      [
        'file a then a/b',
        [
          { path: `${PREFIX}/a`, type: 'file', mode: 0o644, content: 'x' },
          { path: `${PREFIX}/a/b`, type: 'file', mode: 0o644, content: 'y' },
        ],
        4,
        `${PREFIX}/a/b`,
      ],
      [
        'a/b then file a',
        [
          { path: `${PREFIX}/a/b`, type: 'file', mode: 0o644, content: 'y' },
          { path: `${PREFIX}/a`, type: 'file', mode: 0o644, content: 'x' },
        ],
        4,
        `${PREFIX}/a`,
      ],
      [
        'directory a/ then file a',
        [
          { path: `${PREFIX}/a/`, type: 'dir', mode: 0o755 },
          { path: `${PREFIX}/a`, type: 'file', mode: 0o644, content: 'x' },
        ],
        4,
        `${PREFIX}/a`,
      ],
      [
        'the same path twice',
        [
          { path: `${PREFIX}/x.txt`, type: 'file', mode: 0o644, content: 'x' },
          { path: `${PREFIX}/x.txt`, type: 'file', mode: 0o644, content: 'y' },
        ],
        4,
        `${PREFIX}/x.txt`,
      ],
      [
        'Readme.md then README.md',
        [
          { path: `${PREFIX}/Readme.md`, type: 'file', mode: 0o644, content: 'x' },
          { path: `${PREFIX}/README.md`, type: 'file', mode: 0o644, content: 'y' },
        ],
        4,
        `${PREFIX}/README.md`,
      ],
      [
        'café.md (NFD) then café.md (NFC)',
        [
          { path: `${PREFIX}/café.md`, type: 'file', mode: 0o644, content: 'x' },
          { path: `${PREFIX}/café.md`, type: 'file', mode: 0o644, content: 'y' },
        ],
        4,
        `${PREFIX}/café.md`,
      ],
    ])('%s -> CW-E08 naming rule %i and the later entry', async (_label, extraEntries, rule, namedPath) => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = buildFixtureArchive(extraEntries)
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08(result.ioHelper.stderrText, rule, namedPath)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })

    it('only the prefix directory -> CW-E08 naming rule 5', async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = gzipSync(buildArchiveRaw([{ path: `${PREFIX}/`, type: 'dir', mode: 0o755 }], { comment: FIXED_COMMIT }))
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08(result.ioHelper.stderrText, 5)
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })

    // S-03/P-03: entries are walked once, in archive order, checking every rule against each one
    // before moving on -- so an EARLIER rule-4 collision is the one CW-E08 names, even though a
    // LATER entry also breaks a rule (3) of its own. Naming the later, rule-3-breaking entry
    // instead would mean CW-E08 is not naming "the first breaking entry in archive order".
    // S-04: an archive with no entries at all AND a wrong comment reports rule 2 (checked
    // first), not rule 5 -- consistent with the Fixed list's own stated rule order (2, 1, 3, 4, 5).
    it('no entries at all and a wrong comment -> CW-E08 naming rule 2, not rule 5', async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = gzipSync(buildArchiveRaw([], { comment: 'abcdef0123456789abcdef0123456789abcdef01' }))
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08CommentMarker(result.ioHelper.stderrText, 2)
        expect(result.ioHelper.stderrText).not.toContain('rule 5')
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })

    it('an earlier collision and a later rule-3 violation -> CW-E08 names the earlier (collision) entry', async () => {
      const tmpRoot = await makeTmpRoot()
      try {
        const body = buildFixtureArchive([
          { path: `${PREFIX}/dup`, type: 'file', mode: 0o644, content: 'x' },
          { path: `${PREFIX}/dup`, type: 'file', mode: 0o644, content: 'y' },
          { path: `${PREFIX}/../traversal`, type: 'file', mode: 0o644, content: 'z' },
        ])
        const result = await runFixture(tmpRoot, body)
        await expectRejected(result)
        expectE08(result.ioHelper.stderrText, 4, `${PREFIX}/dup`)
        expect(result.ioHelper.stderrText).not.toContain('rule 3')
      } finally {
        await rm(tmpRoot, { recursive: true, force: true })
      }
    })
  })
})

// P-01/C-02 (severity: high): two independent parsers walking the same bytes must apply the same
// size rules, or an attacker can hide a header from rule 1 inside bytes one parser treats as
// content and the other treats as the next header. This fixture combines the two divergences the
// finding names: a directory entry whose encoded size (512) does not match `tar`'s own forced-0
// size for a directory, hiding a symlink header in what looks like its content; and a pax `x`
// header overriding a LATER file's size upward (while that file's own ustar field under-states
// it), so a SECOND smuggled header re-synchronises an index-based pairing's count. Verified
// against the pre-fix implementation: it accepted the archive (exit 0) and wrote the symlink as
// an empty regular file.
describe('desync resistance (rule 1 cannot be hidden by a size mismatch)', () => {
  it('a directory with a lying size hiding a symlink, re-synchronised by a pax size override -> CW-E08, nothing written', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const paxGlobal = new Pax({ comment: FIXED_COMMIT }, true).encode()
      const prefixDir = headerBlock({ path: `${PREFIX}/`, type: 'Directory', mode: 0o755, size: 0 })
      const changelog = Buffer.from(CHANGELOG_CONTENT)
      const changelogH = headerBlock({ path: `${PREFIX}/CHANGELOG.md`, type: 'File', mode: 0o644, size: changelog.length })
      const oqDir = headerBlock({ path: `${PREFIX}/.proj.specs/`, type: 'Directory', mode: 0o755, size: 0 })
      const oq = Buffer.from(OPEN_QUESTIONS_CONTENT)
      const oqH = headerBlock({
        path: `${PREFIX}/.proj.specs/OPEN-QUESTIONS.md`,
        type: 'File',
        mode: 0o644,
        size: oq.length,
      })
      const pkg = Buffer.from(PACKAGE_JSON_CONTENT)
      const pkgH = headerBlock({ path: `${PREFIX}/package.json`, type: 'File', mode: 0o644, size: pkg.length })

      // Encoded size 512 but `Header.decode` forces a directory's effective size to 0: the 512
      // "content" bytes that follow are really the next header, a symlink.
      const lyingDirHeader = headerBlock({ path: `${PREFIX}/evil/`, type: 'Directory', mode: 0o755, size: 512 })
      const hiddenSymlink = headerBlock({
        path: `${PREFIX}/hidden-link`,
        type: 'SymbolicLink',
        mode: 0o644,
        linkpath: 'package.json',
      })

      // Encoded size 0, but a preceding pax `x` header overrides it to 512: `tar` reads 512
      // bytes of content (which happens to look like a header); an index-based pairing that
      // skips only the encoded 0 bytes would instead discover that "content" as a new header,
      // absorbing the earlier shortfall and re-aligning its count with `tar`'s.
      const paxX = paxExtendedHeaderBlock({ size: 512 })
      const decoyHeader = headerBlock({ path: `${PREFIX}/decoy.txt`, type: 'File', mode: 0o644, size: 0 })
      const embeddedHeader = headerBlock({ path: `${PREFIX}/not-really-an-entry.txt`, type: 'File', mode: 0o644, size: 0 })

      const body = gzipSync(
        Buffer.concat([
          paxGlobal,
          prefixDir,
          changelogH,
          pad512(changelog),
          oqDir,
          oqH,
          pad512(oq),
          pkgH,
          pad512(pkg),
          lyingDirHeader,
          hiddenSymlink,
          paxX,
          decoyHeader,
          embeddedHeader,
          Buffer.alloc(1024),
        ]),
      )

      const result = await runFixture(tmpRoot, body)
      await expectRejected(result)
      expect(result.ioHelper.stderrText.startsWith('CW-E08')).toBe(true)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

// P-04: the spec's rule 3 only excepts a directory's trailing `/` from the "no empty component"
// rule -- it does not require one. A directory entry whose path does not end in `/` must still
// be accepted.
describe('rule 3 accepts a directory typeflag without a trailing slash (P-04)', () => {
  it('a type-5 directory entry named without a trailing / is accepted', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const body = buildFixtureArchive([
        { path: `${PREFIX}/nodir`, type: 'dir', mode: 0o755 },
        { path: `${PREFIX}/nodir/inside.txt`, type: 'file', mode: 0o644, content: 'x' },
      ])
      const result = await runFixture(tmpRoot, body)
      expect(result.exitCode).toBe(0)
      expect(result.ioHelper.stderrText).toBe('')
      expect(await readFile(join(result.target, 'nodir/inside.txt'), 'utf8')).toBe('x')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

// P-10/C-12: the pax global `comment` must be read whatever kind the entries turn out to be, not
// only when at least one happens to be an ordinary 'entry'. An archive whose only entry is of an
// ignored type (so the comment can only ever be observed through the 'ignoredEntry' event) must
// still have its comment recognised, and rule 1 -- not rule 2's "missing comment" -- must be the
// one CW-E08 reports.
describe("pax global comment is read even when every entry is of an ignored type (P-10/C-12)", () => {
  it('a correct comment with only a GNU-sparse entry -> CW-E08 naming rule 1, not rule 2', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const body = gzipSync(
        buildArchiveRaw([{ path: `${PREFIX}/evil`, type: 'sparse', mode: 0o644, content: '' }], {
          comment: FIXED_COMMIT,
        }),
      )
      const result = await runFixture(tmpRoot, body)
      await expectRejected(result)
      expectE08(result.ioHelper.stderrText, 1, `${PREFIX}/evil`)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('metadata headers', () => {
  const PAX_LONG_PATH = `${PREFIX}/longpax/${'p'.repeat(90)}.txt`
  const GNU_LONG_PATH = `${PREFIX}/longgnu/${'g'.repeat(100)}.txt`

  it('pax global/extended and GNU long-name headers are metadata, not entries; ordinary entries are accepted', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const extra = [
        { path: `${PREFIX}/longpax/`, type: 'dir', mode: 0o755 },
        {
          path: `${PREFIX}/pax-placeholder.txt`,
          type: 'file',
          mode: 0o644,
          content: 'pax long path content\n',
          extraBlocksBefore: [paxExtendedHeaderBlock({ path: PAX_LONG_PATH })],
        },
        { path: `${PREFIX}/longgnu/`, type: 'dir', mode: 0o755 },
        {
          path: `${PREFIX}/gnu-placeholder.txt`,
          type: 'file',
          mode: 0o644,
          content: 'gnu long path content\n',
          extraBlocksBefore: [gnuLongNameBlock(GNU_LONG_PATH)],
        },
        { path: `${PREFIX}/nul-typed.txt`, type: 'file', mode: 0o644, content: 'nul', rawTypeflag: '\u0000' },
        { path: `${PREFIX}/contiguous.txt`, type: 'file', mode: 0o644, content: 'seven', rawTypeflag: '7' },
      ]
      const body = buildFixtureArchive(extra)
      const result = await runFixture(tmpRoot, body)

      expect(result.exitCode).toBe(0)
      expect(result.ioHelper.stderrText).toBe('')

      // S-07/P-06: collects directories too (with a trailing `/`), not only files, so an extra
      // or misnamed directory (e.g. a metadata header mistakenly materialised as one) would show
      // up here just as a stray file would.
      async function listPaths(dir, base = '') {
        const names = await readdir(dir, { withFileTypes: true })
        let out = []
        for (const e of names) {
          const rel = base ? `${base}/${e.name}` : e.name
          if (e.isDirectory()) {
            out.push(`${rel}/`)
            out = out.concat(await listPaths(join(dir, e.name), rel))
          } else {
            out.push(rel)
          }
        }
        return out
      }
      const paths = (await listPaths(result.target)).sort()
      expect(paths).toEqual(
        [
          'CHANGELOG.md',
          '.proj.specs/',
          '.proj.specs/OPEN-QUESTIONS.md',
          'package.json',
          'longpax/',
          `longpax/${'p'.repeat(90)}.txt`,
          'longgnu/',
          `longgnu/${'g'.repeat(100)}.txt`,
          'nul-typed.txt',
          'contiguous.txt',
          'range.json',
        ].sort(),
      )
      expect(paths.some((f) => f.includes('PaxHeader') || f.includes('@LongLink') || f.includes('pax_global_header'))).toBe(
        false,
      )

      expect(await readFile(join(result.target, `longpax/${'p'.repeat(90)}.txt`), 'utf8')).toBe('pax long path content\n')
      expect(await readFile(join(result.target, `longgnu/${'g'.repeat(100)}.txt`), 'utf8')).toBe('gnu long path content\n')
      expect(await readFile(join(result.target, 'nul-typed.txt'), 'utf8')).toBe('nul')
      expect(await readFile(join(result.target, 'contiguous.txt'), 'utf8')).toBe('seven')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('strict parse', () => {
  it.each([
    [
      'truncated gzip',
      () => {
        const full = gzipSync(buildArchiveRaw(basePrefixedEntries(), { comment: FIXED_COMMIT }))
        return full.subarray(0, Math.floor(full.length / 2))
      },
    ],
    ['HTML body (status 200)', () => Buffer.from('<!DOCTYPE html><html><body>nope</body></html>', 'utf8')],
    [
      'corrupted header checksum',
      // S-06/P-02: built on the same valid fixture every other row uses (pax comment, P1-P3
      // files) so this case is distinguished from a rule violation by the checksum alone, not by
      // accidentally also missing the comment or the pristine files.
      () => buildFixtureArchive([{ path: `${PREFIX}/a.txt`, type: 'file', mode: 0o644, content: 'x', corruptChecksum: true }]),
    ],
    [
      'tar truncated mid-entry-content',
      () => {
        // A large last file, so cutting off its tail lands inside its content block, not just
        // inside the two trailing zero blocks (which `tar` tolerates missing in full).
        const entries = [...basePrefixedEntries().slice(0, -1), {
          path: `${PREFIX}/package.json`,
          type: 'file',
          mode: 0o644,
          content: 'x'.repeat(2000) + '\n',
        }]
        const full = buildArchiveRaw(entries, { comment: FIXED_COMMIT })
        return gzipSync(full.subarray(0, full.length - 1200))
      },
    ],
  ])('%s -> CW-E08 with a parse error, nothing written', async (_label, buildBody) => {
    const tmpRoot = await makeTmpRoot()
    try {
      const body = buildBody()
      const result = await runFixture(tmpRoot, body)
      await expectRejected(result)
      // S-06/P-02: distinguishes a parse error from an entry-rule violation (both print CW-E08);
      // without this, a body that regressed into tripping rule 5 (say) instead of actually
      // failing to parse would still make the test pass.
      expect(result.ioHelper.stderrText).toContain('could not be parsed')
      expect(result.ioHelper.stderrText).not.toContain('entry rule')
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

// S-02/P-08/C-08: `run` must catch only `ArchiveParseError` and rethrow anything else -- a bug
// inside the parse step is not "the archive is broken" (CW-E08), it is a bug (T-0024's CW-E14).
// P-12/C-06: decompression is bounded (node-tar's own 1000x ratio, mirrored here since the raw
// walker gunzips independently of `tar`'s Parser): a small, highly-compressible gzip body
// ("gzip bomb") must not be decompressed to an unbounded size in memory before any rule runs.
// Asserted directly against `walkRawEntries` (not through `run()`): with no bound, decompressing
// 5 MiB of zeros still SUCCEEDS and -- because it is still all zeros, i.e. no tar content at all
// -- `run()` would reject it anyway for an unrelated reason (no entries), which would make a
// round-trip test of this bound pass whether or not the bound exists.
describe('decompression is bounded (a small gzip bomb is rejected, not expanded)', () => {
  it('a 5 MiB all-zero body compressed to ~5 KB is rejected before being fully decompressed', () => {
    const body = gzipSync(Buffer.alloc(5 * 1024 * 1024), { level: 9 })
    expect(() => walkRawEntries(body)).toThrow()
  })
})

// P-11/C-07: the run path requires a gzip body (codeload's own contract); a plain, uncompressed
// tar body -- even a perfectly well-formed one -- is CW-E08, not silently accepted. The walker's
// OWN export (`walkRawEntries`) still accepts plain tar directly, for T-0025's X7 (`git archive`'s
// plain tar output), but only by calling it directly, never through this run path.
describe('a plain (uncompressed) tar body is rejected, not silently accepted (P-11/C-07)', () => {
  it('a well-formed, uncompressed tar body -> CW-E08, nothing written', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const body = buildArchiveRaw(basePrefixedEntries(), { comment: FIXED_COMMIT }) // not gzipped
      const result = await runFixture(tmpRoot, body)
      await expectRejected(result)
      expect(result.ioHelper.stderrText.startsWith('CW-E08')).toBe(true)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })

  // S-17: the plain-tar branch `walkRawEntries` itself accepts is not dead code -- it is
  // reachable, just not through `run()` (the line above pins that it is NOT reachable there);
  // this exercises the branch directly, the way T-0025's X7 is expected to reuse it.
  it("walkRawEntries itself still reads a plain tar body's typeflags directly (T-0025's own export)", () => {
    const raw = buildArchiveRaw(basePrefixedEntries(), { comment: FIXED_COMMIT }) // not gzipped
    const nonMeta = walkRawEntries(raw).filter((e) => !e.isMeta)
    expect(nonMeta.map((e) => e.rawTypeflag)).toEqual(['5', '0', '5', '0', '0'])
  })
})

describe('a non-parse error from the archive step is CW-E14, not reported as CW-E08', () => {
  it('a body that is not buffer-coercible -> CW-E14 with the TypeError message, not CW-E08', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const fetchArchive = async () => ({ status: 200, body: null })
      const deps = makeDeps({ env: { LANG: 'en_US' }, cwd: tmpRoot, fetchArchive })
      const ioHelper = makeIo()
      const exitCode = await run(['range', '--no-setup'], ioHelper.io, deps)
      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^CW-E14/m)
      expect(ioHelper.stderrText).toContain('Received null')
      expect(ioHelper.stderrText).not.toMatch(/^CW-E08/m)
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

// S-14: the zh-TW wording for the archive itself is 「壓縮檔」 (not 「封存檔」, which collides with
// the retired-challenge glossary entry's own _Avoid_ note), and CW-E10 names the pristine RANGE's
// processing rule, 「原廠靶場處理規則」 (GLOSSARY's own term for a pristine range), not the
// unregistered 「原廠處理」.
describe('zh-TW wording (S-14)', () => {
  it('CW-E08 says 壓縮檔 for the archive', () => {
    expect(messages['zh-TW']['CW-E08']({ rule: 1, path: 'x' })).toContain('壓縮檔')
    expect(messages['zh-TW']['CW-E08']({ parseError: 'x' })).toContain('壓縮檔')
  })

  it('CW-E10 says 原廠靶場處理規則', () => {
    expect(messages['zh-TW']['CW-E10']({ file: 'package.json', rule: 'P3' })).toContain('原廠靶場處理規則')
  })
})
