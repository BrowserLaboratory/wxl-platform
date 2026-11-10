// 0006 message wording (F17/A10, stage 6 disposition): UP-E10 has three distinct branches -- no
// version at all ("could not be read"), a version string that is present but does not match
// X.Y.Z ("is not valid"), and a version that parses as X.Y.Z but is below the 3.0.0 floor ("is
// lower than 3.0.0"); UP-E02 has two ("found" a version, or not). Each is rendered here in both
// language tables, each beginning with its own code (traceability.md "Language"), following the
// same ARGS-object calling convention `language.test.mjs` uses for the CW-*/N-* ids -- this is a
// NEW file, not an edit of `language.test.mjs`, because that file's own id-set parity check
// already covers UP-* ids by construction (same `en`/`zhTW` objects), but its "starts with its
// code" check only matches `/CW-[EW]\d\d/`, so a UP-* message is checked explicitly here instead.

import { describe, it, expect } from 'vitest'
import { rm } from 'node:fs/promises'
import { run } from '../src/run.mjs'
import { makeDeps } from './helpers/deps.mjs'
import { makeIo } from './helpers/io.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { en, zhTW } from '../src/messages.mjs'
import { buildReport } from '../src/upgrade-report.mjs'
import { expectRestoreOrder } from './helpers/restore.mjs'

describe('UP-E10 wording: a present-but-invalid-format version is "not valid", not "lower than 3.0.0"', () => {
  it('en and zh-TW both begin with UP-E10 and distinguish an invalid format from a too-low version', () => {
    const invalidFormatArgs = { version: '3.0' } // present, but not X.Y.Z
    const numberArgs = { version: 3 } // present, not even a string
    const tooLowArgs = { version: '2.9.9' } // present, valid X.Y.Z, below the floor
    const missingArgs = { version: undefined } // absent entirely

    const enInvalid = en['UP-E10'](invalidFormatArgs)
    const zhInvalid = zhTW['UP-E10'](invalidFormatArgs)
    const enNumber = en['UP-E10'](numberArgs)
    const zhNumber = zhTW['UP-E10'](numberArgs)
    const enLow = en['UP-E10'](tooLowArgs)
    const zhLow = zhTW['UP-E10'](tooLowArgs)
    const enMissing = en['UP-E10'](missingArgs)
    const zhMissing = zhTW['UP-E10'](missingArgs)

    for (const text of [enInvalid, enNumber, enLow, enMissing]) {
      expect(text.startsWith('UP-E10')).toBe(true)
    }
    for (const text of [zhInvalid, zhNumber, zhLow, zhMissing]) {
      expect(text.startsWith('UP-E10')).toBe(true)
    }

    // The invalid-format wording never claims the version is numerically lower.
    expect(enInvalid).not.toContain('lower than 3.0.0')
    expect(zhInvalid).not.toContain('低於 3.0.0')
    expect(enNumber).not.toContain('lower than 3.0.0')
    expect(zhNumber).not.toContain('低於 3.0.0')

    // The too-low wording is unchanged.
    expect(enLow).toContain('lower than 3.0.0')
    expect(zhLow).toContain('低於 3.0.0')

    // All three branches render distinct text in each language.
    expect(enInvalid).not.toBe(enLow)
    expect(enInvalid).not.toBe(enMissing)
    expect(enLow).not.toBe(enMissing)
    expect(zhInvalid).not.toBe(zhLow)
    expect(zhInvalid).not.toBe(zhMissing)
    expect(zhLow).not.toBe(zhMissing)
  })
})

describe('UP-E10 wording (candidate 22): a non-string version prints as JSON, not through jsonValue', () => {
  it('an array ["3.1.0"] prints as ["3.1.0"], not the quoted-only "3.1.0" form', () => {
    const args = { version: ['3.1.0'] }

    const enText = en['UP-E10'](args)
    const zhText = zhTW['UP-E10'](args)

    expect(enText.startsWith('UP-E10')).toBe(true)
    expect(zhText.startsWith('UP-E10')).toBe(true)
    expect(enText).toContain('["3.1.0"]')
    expect(zhText).toContain('["3.1.0"]')
    expect(enText).not.toContain('"3.1.0" is not valid')
    expect(enText).not.toMatch(/the base version "3\.1\.0" /)
    expect(zhText).not.toMatch(/base 版本 "3\.1\.0" /)

    // D10's escape form inside the JSON: a tab is `\u0009`, not JSON.stringify's own `\t`;
    // an escaped backslash followed by `t` stays as it is.
    const tabText = en['UP-E10']({ version: ['a\tb', 'c\\td'] })
    expect(tabText).toContain('["a\\u0009b","c\\\\td"]')
  })

  it('an object {"toString":1} does not throw, and prints as JSON', () => {
    const args = { version: { toString: 1 } }

    expect(() => en['UP-E10'](args)).not.toThrow()
    expect(() => zhTW['UP-E10'](args)).not.toThrow()

    const enText = en['UP-E10'](args)
    const zhText = zhTW['UP-E10'](args)

    expect(enText.startsWith('UP-E10')).toBe(true)
    expect(zhText.startsWith('UP-E10')).toBe(true)
    expect(enText).toContain('{"toString":1}')
    expect(zhText).toContain('{"toString":1}')
  })
})

describe('UP-E02 wording: with and without a detected version', () => {
  it('en and zh-TW both begin with UP-E02; only the with-version branch names the version found', () => {
    const withVersion = { version: '2.19.0' }
    const withoutVersion = { version: undefined }

    const enWith = en['UP-E02'](withVersion)
    const zhWith = zhTW['UP-E02'](withVersion)
    const enWithout = en['UP-E02'](withoutVersion)
    const zhWithout = zhTW['UP-E02'](withoutVersion)

    for (const text of [enWith, zhWith, enWithout, zhWithout]) {
      expect(text.startsWith('UP-E02')).toBe(true)
    }

    expect(enWith).toContain('2.19.0')
    expect(zhWith).toContain('2.19.0')
    expect(enWithout).not.toContain('2.19.0')
    expect(zhWithout).not.toContain('2.19.0')
    expect(enWith).not.toBe(enWithout)
    expect(zhWith).not.toBe(zhWithout)
  })
})

// D21 (revision 3.3, T-0065): the upgrade's UP-E02 and create's CW-W01 both name the 2.26 floor, from
// the one constant they share.
describe('git floor text (D21)', () => {
  it.each([
    ['UP-E02 en', () => en['UP-E02']({ version: '2.25.1' })],
    ['UP-E02 zh-TW', () => zhTW['UP-E02']({ version: '2.25.1' })],
    ['CW-W01 en (0005)', () => en['CW-W01']({ remainingCommands: [] })],
    ['CW-W01 zh-TW (0005)', () => zhTW['CW-W01']({ remainingCommands: [] })],
  ])('%s names 2.26 and not 2.20', (_label, render) => {
    const text = render()
    expect(text).toMatch(/2\.26(?!\.)/)
    expect(text).not.toContain('2.20')
  })
})

describe('--lang zh-TW upgrade in a non-git folder', () => {
  it('prints the zh-TW UP-E01 text, not the en one', async () => {
    const tmpRoot = await makeTmpRoot()
    try {
      const env = { HOME: tmpRoot, PATH: process.env.PATH, LANG: 'en_US.UTF-8' }
      const deps = makeDeps({ cwd: tmpRoot, env, runGit: createSpawnGitRunner() })
      const ioHelper = makeIo()
      const exitCode = await run(['--lang', 'zh-TW', 'upgrade'], ioHelper.io, deps)

      expect(exitCode).toBe(1)
      expect(ioHelper.stderrText).toMatch(/^UP-E01/m)
      expect(ioHelper.stderrText).toContain(zhTW['UP-E01']({ path: tmpRoot }))
      expect(ioHelper.stderrText).not.toContain(en['UP-E01']({ path: tmpRoot }))
    } finally {
      await rm(tmpRoot, { recursive: true, force: true })
    }
  })
})

describe('every UP-* message starts with its own code', () => {
  // (P-11/S-12-style check, mirrors `language.test.mjs`'s CW-only version): representative
  // arguments for every UP-* id, enough to call each once per language.
  const UP_ARGS = {
    'UP-E01': { path: '/a/b' },
    'UP-E02': { version: '2.19.0' },
    'UP-E03': { reason: 'changes' },
    'UP-E04': {},
    'UP-E05': { rangeRepository: 'a/b', sourceRepository: 'c/d' },
    'UP-E06': { reason: 'upstream' },
    'UP-E07': { baseVersion: '3.1.0', targetVersion: '3.0.0' },
    'UP-E08': { tag: 'v3.1.0' },
    'UP-E10': { version: '2.9.9' },
    'UP-I01': { version: '3.0.0', commit: '0'.repeat(40) },
    // T-0027 increment 1 (ticket Comments, 2026-11-09): one entry per new code, at the
    // increment adding it -- these six take no fields at all (messages.mjs's own comment).
    'UP-A1': {},
    'UP-A2': {},
    'UP-A3': {},
    'UP-A4': {},
    'UP-A5': {},
    'UP-A6': {},
    // T-0027 increment 4 (ticket Comments, 2026-11-09): added at the increment that adds the
    // code (U20, P-3).
    'UP-A7': {},
    // T-0027 increment 6 (ticket Comments, 2026-11-09): added at the increment that adds the
    // code (U22, P-5).
    'UP-A9': {},
    // T-0027 increment 10 (ticket Comments, 2026-11-09): added at the increment that adds the
    // code (U27, step 9's write failure).
    'UP-E09': { path: '/a/b/pnpm-lock.yaml', detail: 'EIO: i/o error' },
    // T-0027 increment 13 (ticket Comments, 2026-11-09): added at the increment that adds the
    // code (U53, P-4).
    'UP-A8': {},
    // T-0027 increment 15 (ticket Comments, 2026-11-09): added at the increment that adds the
    // code (U54/U55, P-6 and the parent check).
    'UP-A10': {},
    // T-0027 increment 18 (ticket Comments, 2026-11-09): added at the increment that adds the
    // code (U57, `git merge-file` outside 0-127).
    'UP-E11': { path: '/a/b/m12-clean.txt' },
    // T-0027 increment 19 (ticket Comments, 2026-11-09): added at the increment that adds the
    // code (U58, M12 clean merge of invalid JSON).
    'UP-A11': {},
    // T-0027 increment 20 (ticket Comments, 2026-11-09): added at the increment that adds the
    // code (U59, Fork:init-derived content / anchor files).
    'UP-A12': {},
    // D9: added at the increment that adds the code (U63, P-7, an ignore file changed
    // upstream).
    'UP-A13': {},
    // D10: added at the increment that adds the code (U64, P-8, a submodule path).
    'UP-A14': {},
    // T-0061 (J6, D11, D18): added at the increment that adds the code (U65).
    'UP-E12': { version: '3.0.0', recordedCommit: '1'.repeat(40), tagCommit: 'a'.repeat(40) },
    // T-0061 (D15): added at the increment that adds the code (U67).
    'UP-E13': {},
    // T-0062 (P-9, D12): added at the increment that adds the code (U68).
    'UP-A15': {},
  }

  it('every UP-* id is present in both tables and its text starts with its own code', () => {
    const upIds = Object.keys(en).filter((id) => id.startsWith('UP-'))
    expect(upIds.length).toBeGreaterThan(0)
    for (const id of upIds) {
      expect(Object.keys(UP_ARGS)).toContain(id) // fails loudly if a new UP-* id needs its own ARGS entry
      expect(en[id]).toBeTypeOf('function')
      expect(zhTW[id]).toBeTypeOf('function')
      for (const table of [en, zhTW]) {
        const text = table[id](UP_ARGS[id])
        // The whole message begins with its own code, so a UP-*
        // message that omitted its code entirely fails here too.
        expect(text.startsWith(id)).toBe(true)
      }
    }
  })
})

describe('UP-E09 wording: the path/detail branch and the signal branch', () => {
  it('en and zh-TW both begin with UP-E09; the signal branch names the signal, not a path, and renders its own text in each branch and each language', () => {
    const pathArgs = { path: '/a/b/pnpm-lock.yaml', detail: 'EIO: i/o error' }
    const signalArgs = { signal: 'SIGTERM' }

    const enPath = en['UP-E09'](pathArgs)
    const zhPath = zhTW['UP-E09'](pathArgs)
    const enSignal = en['UP-E09'](signalArgs)
    const zhSignal = zhTW['UP-E09'](signalArgs)

    for (const text of [enPath, zhPath, enSignal, zhSignal]) {
      expect(text.startsWith('UP-E09')).toBe(true)
      expectRestoreOrder(text) // D14 (T-0063): the restore commands
    }

    expect(enSignal).toContain('SIGTERM')
    expect(zhSignal).toContain('SIGTERM')
    expect(enSignal).not.toContain('pnpm-lock.yaml')
    expect(zhSignal).not.toContain('pnpm-lock.yaml')
    expect(enPath).not.toContain('SIGTERM')
    expect(zhPath).not.toContain('SIGTERM')

    // Each branch renders its own text, distinct from the other branch and from the other
    // language.
    expect(enPath).not.toBe(enSignal)
    expect(zhPath).not.toBe(zhSignal)
    expect(enPath).not.toBe(zhPath)
    expect(enSignal).not.toBe(zhSignal)
  })
})

// R1, R2, every R4 line and R5 each render their own text in en and in zh-TW, present in both
// languages and never the same string -- checked here at the message level (`buildReport`
// directly), not by running a whole upgrade as `upgrade-report.test.mjs` already does.
describe('report line text (R1, R2, R4, R5) exists in both languages and differs', () => {
  it('renders R1, R2, every R4 line and R5 with its own text in en and in zh-TW, never the same string', () => {
    const common = {
      toolVersion: '1.2.3',
      baseVersion: '1.0.0',
      baseCommit: 'a'.repeat(40),
      targetVersion: '1.1.0',
      targetCommit: 'b'.repeat(40),
      // A written `package.json` and a deploy workflow together trigger both of R4's conditional
      // bullets, so this one fixture exercises every R4 line in a single call.
      ops: [{ path: 'package.json', action: 'write', existedBefore: true }],
      attention: [],
      hasDeployWorkflow: true,
    }
    const reportEn = buildReport({ ...common, lang2: 'en', t2: en })
      .split('\n')
      .filter((line) => line !== '')
    const reportZh = buildReport({ ...common, lang2: 'zh-TW', t2: zhTW })
      .split('\n')
      .filter((line) => line !== '')

    const linesFor = (lines, id) => lines.filter((line) => line.startsWith(id))

    for (const id of ['R1:', 'R2:', 'R5:']) {
      const [enLine] = linesFor(reportEn, id)
      const [zhLine] = linesFor(reportZh, id)
      expect(enLine, `${id} missing from the en report`).toBeTruthy()
      expect(zhLine, `${id} missing from the zh-TW report`).toBeTruthy()
      expect(zhLine).not.toBe(enLine)
    }

    const r4En = linesFor(reportEn, 'R4:')
    const r4Zh = linesFor(reportZh, 'R4:')
    expect(r4En.length).toBeGreaterThan(0)
    expect(r4Zh.length).toBe(r4En.length)
    // `R4: commit` is the one R4 line with no translated words around it at all (`commit` is the
    // whole line, as `upgrade-report.mjs`'s `buildR4Lines` writes it, unconditionally, for both
    // languages) -- every other R4 line differs between languages.
    r4En.forEach((line, i) => (line === 'R4: commit' ? expect(r4Zh[i]).toBe(line) : expect(r4Zh[i]).not.toBe(line)))

    // R1 names the commit in both languages.
    expect(linesFor(reportEn, 'R1:')[0]).toContain('commit')
    expect(linesFor(reportZh, 'R1:')[0]).toContain('commit')
  })
})

// T-0061 stage 6 (F5, F6, F7, F8, F16, B8, B9; traceability.md revision 3.2 D18): the content of the
// messages T-0061 adds or extends, in both languages, beyond "begins with its code".
describe('T-0061 message content: UP-E12, UP-E13, and the remedies of UP-E08 and CW-E07', () => {
  const REMEDY_ORDER = ['--from <version>', '--from <commit>', 'git log -p -- range.json']
  function expectRemediesInOrder(text) {
    const at = REMEDY_ORDER.map((needle) => text.indexOf(needle))
    expect(at[0]).toBeGreaterThan(-1)
    expect(at[1]).toBeGreaterThan(at[0])
    expect(at[2]).toBeGreaterThan(at[1])
  }
  const E12 = { version: '3.0.0', recordedCommit: '1'.repeat(40), tagCommit: 'a'.repeat(40) }

  it('UP-E12 says the recorded commit is not a release, names a package packed at a commit other than its version\'s tag, and gives the remedies in order (en, zh-TW)', () => {
    const enText = en['UP-E12'](E12)
    const zhText = zhTW['UP-E12'](E12)
    expect(enText).toContain('is not a release')
    expect(enText).toContain("other than its version's tag")
    expect(enText).toContain('the setup record')
    expect(zhText).toContain('不是發布版')
    expect(zhText).toContain('不是該版本 tag 的 commit')
    expect(zhText).toContain('設定紀錄')
    expectRemediesInOrder(enText)
    expectRemediesInOrder(zhText)
  })

  it('UP-E08 with remedies says the recorded commit could not be checked against its tag, not that it is not a release; without remedies it names no --from (en, zh-TW)', () => {
    for (const [table, checked, notRelease, unread] of [
      [en, 'could not be checked against its tag', 'is not a release', 'the commit the tag names could not be read'],
      [zhTW, '沒辦法經由它的 tag 驗證', '不是發布版', '讀不到 tag 指向的 commit'],
    ]) {
      const withRemedies = table['UP-E08']({ tag: 'v3.0.0', remedies: true })
      expect(withRemedies).toContain(checked)
      expect(withRemedies).not.toContain(notRelease)
      expect(withRemedies).toContain(unread)
      expectRemediesInOrder(withRemedies)
      expect(table['UP-E08']({ tag: 'v3.0.0' })).not.toContain('--from')
    }
  })

  it('CW-E07 with remedies says the recorded commit could not be checked against its tag; without remedies it is 0005\'s message (en, zh-TW)', () => {
    const args = { url: 'https://codeload.github.com/x/y/tar.gz/refs/tags/v3.0.0', detail: { kind: 'status', status: 404 } }
    for (const [table, checked, notRelease] of [
      [en, 'could not be checked against its tag', 'is not a release'],
      [zhTW, '沒辦法經由它的 tag 驗證', '不是發布版'],
    ]) {
      const withRemedies = table['CW-E07']({ ...args, remedies: true })
      expect(withRemedies).toContain(checked)
      expect(withRemedies).not.toContain(notRelease)
      expectRemediesInOrder(withRemedies)
      expect(table['CW-E07'](args)).not.toContain('--from')
    }
  })

  it('UP-E13 names the three places a rule can be, both remedies, and the letter-case rename with Range.json as the example; zh-TW says 被追蹤, never "tracked"', () => {
    for (const table of [en, zhTW]) {
      const text = table['UP-E13']()
      for (const needle of ['.git/info/exclude', 'core.excludesFile', 'git add -f -- range.json', 'git mv', 'Range.json']) {
        expect(text).toContain(needle)
      }
    }
    expect(zhTW['UP-E13']()).not.toContain('tracked')
    expect(zhTW['UP-E13']()).toContain('被追蹤')
  })
})
