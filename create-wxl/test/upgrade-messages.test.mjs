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
import { en, zhTW, upgradeMergeNotImplemented } from '../src/messages.mjs'

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
        // A10 (stage 6 verification): the whole message begins with its own code, so a UP-*
        // message that omitted its code entirely fails here too.
        expect(text.startsWith(id)).toBe(true)
      }
    }
  })
})

describe('upgradeMergeNotImplemented: the decision-(4) detail outside the id tables', () => {
  it('has exactly an en and a zh-TW text, both non-empty and different', () => {
    expect(Object.keys(upgradeMergeNotImplemented).sort()).toEqual(['en', 'zh-TW'])
    expect(upgradeMergeNotImplemented.en).toBe('the upgrade merge is not implemented yet')
    expect(upgradeMergeNotImplemented['zh-TW']).toBeTypeOf('string')
    expect(upgradeMergeNotImplemented['zh-TW'].length).toBeGreaterThan(0)
    expect(upgradeMergeNotImplemented['zh-TW']).not.toBe(upgradeMergeNotImplemented.en)
  })
})
