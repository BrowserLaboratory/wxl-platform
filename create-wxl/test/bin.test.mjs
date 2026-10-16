// 0005-S1 (the `bin`), C67/AC-23: a broken package (`dist/` missing or inconsistent) makes the
// real `bin` print CW-E13 in the environment's language and exit 1, writing nothing -- but an
// argument error still comes first (AC-2), and the hash check itself happens inside `run`'s own
// step 2 (ticket Comments, "increment plan confirmed"). Deviation from the approved test plan
// table (recorded in that same comment): this file is `.mjs`, not `.ts` -- vitest's `include`
// (`vitest.config.mjs:6`) only collects `test/**/*.test.mjs`.

import { describe, it, expect, afterEach } from 'vitest'
import { spawn } from 'node:child_process'
import { readdir, rm, writeFile, appendFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { en, zhTW } from '../src/messages.mjs'
import { makeBinPackage } from './helpers/bin-package.mjs'
import { makeTmpRoot } from './helpers/tmp.mjs'

/** P-05/S-13: the package's OWN `dist/` must be untouched by a broken run, not only the cwd --
 * `null` means `dist/` itself does not exist (the (a) scenario breaks it that way on purpose). */
async function distSnapshot(distPath) {
  let names
  try {
    names = (await readdir(distPath)).sort()
  } catch {
    return null
  }
  const entries = []
  for (const name of names) {
    const bytes = await readFile(join(distPath, name))
    entries.push({ name, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  return entries
}

const BIN_SOURCE_PATH = fileURLToPath(new URL('../bin/create-wxl.mjs', import.meta.url))

const MESSAGES_BY_LANG = { en, 'zh-TW': zhTW }

function envFor(langValue) {
  const env = { PATH: process.env.PATH, HOME: process.env.HOME ?? '' }
  if (process.platform === 'win32' && process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot
  if (langValue !== undefined) env.LANG = langValue
  return env
}

function spawnBin(binPath, argv, { cwd, env }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [binPath, ...argv], { cwd, env })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => resolvePromise({ code, stdout, stderr }))
  })
}

const packages = []
async function getPackage() {
  const pkg = await makeBinPackage()
  packages.push(pkg)
  return pkg
}

afterEach(async () => {
  while (packages.length > 0) {
    await packages.pop().cleanup()
  }
})

describe('bin', () => {
  // S-28: the three ways dist/ can be broken, each × both languages, as one table instead of
  // three near-identical `it.each` blocks.
  it.each([
    ['dist/ removed entirely', 'LANG=zh_TW.UTF-8', 'zh_TW.UTF-8', 'zh-TW', (pkg) => rm(pkg.distPath, { recursive: true, force: true })],
    ['dist/ removed entirely', 'LANG=en_US', 'en_US', 'en', (pkg) => rm(pkg.distPath, { recursive: true, force: true })],
    [
      'dist/fork-init.mjs altered (hash mismatch, via run step 2)',
      'LANG=zh_TW.UTF-8',
      'zh_TW.UTF-8',
      'zh-TW',
      (pkg) => appendFile(join(pkg.distPath, 'fork-init.mjs'), '\n// a legal, but hash-breaking, comment\n'),
    ],
    [
      'dist/fork-init.mjs altered (hash mismatch, via run step 2)',
      'LANG=en_US',
      'en_US',
      'en',
      (pkg) => appendFile(join(pkg.distPath, 'fork-init.mjs'), '\n// a legal, but hash-breaking, comment\n'),
    ],
    [
      "dist/fork-init.mjs has a syntax error (import fails, bin's own catch)",
      'LANG=zh_TW.UTF-8',
      'zh_TW.UTF-8',
      'zh-TW',
      (pkg) => writeFile(join(pkg.distPath, 'fork-init.mjs'), 'export const BROKEN = (\n'),
    ],
    [
      "dist/fork-init.mjs has a syntax error (import fails, bin's own catch)",
      'LANG=en_US',
      'en_US',
      'en',
      (pkg) => writeFile(join(pkg.distPath, 'fork-init.mjs'), 'export const BROKEN = (\n'),
    ],
  ])('%s (%s) -> CW-E13', async (_label, _langLabel, langValue, expectedLang, breakDist) => {
    const pkg = await getPackage()
    await breakDist(pkg)
    const distBefore = await distSnapshot(pkg.distPath)

    const cwd = await makeTmpRoot('create-wxl-bin-cwd-')
    try {
      const before = await readdir(cwd)
      const result = await spawnBin(pkg.binPath, ['s8', '--no-setup'], { cwd, env: envFor(langValue) })

      expect(result.code).toBe(1)
      expect(result.stdout).toBe('')
      const expectedText = MESSAGES_BY_LANG[expectedLang]['CW-E13']() + '\n'
      expect(result.stderr).toBe(expectedText)
      expect(result.stderr.startsWith('CW-E13')).toBe(true)
      expect(result.stderr).toContain('npm create wxl@latest')

      const after = await readdir(cwd)
      expect(after).toEqual(before)
      expect(after).not.toContain('s8')
      expect(after.some((name) => name.startsWith('.create-wxl-'))).toBe(false)

      // P-05/S-13: the package's own dist/ is untouched too -- "nothing written" covers both
      // sides, not only the cwd.
      const distAfter = await distSnapshot(pkg.distPath)
      expect(distAfter).toEqual(distBefore)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it('control (d): dist/ intact, target an existing file -> CW-E04, not CW-E13, no network', async () => {
    const pkg = await getPackage()

    const cwd = await makeTmpRoot('create-wxl-bin-cwd-')
    try {
      await writeFile(join(cwd, 'already-here'), 'x')
      const result = await spawnBin(pkg.binPath, ['already-here'], { cwd, env: envFor('en_US') })

      expect(result.stderr.startsWith('CW-E04')).toBe(true)
      expect(result.stderr.startsWith('CW-E13')).toBe(false)
      expect(result.code).toBe(1)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it('control (e): dist/ removed AND --bogus -> CW-E02, argument errors come before CW-E13', async () => {
    const pkg = await getPackage()
    await rm(pkg.distPath, { recursive: true, force: true })

    const cwd = await makeTmpRoot('create-wxl-bin-cwd-')
    try {
      const result = await spawnBin(pkg.binPath, ['s8', '--no-setup', '--bogus'], { cwd, env: envFor('en_US') })

      expect(result.stderr.startsWith('CW-E02')).toBe(true)
      expect(result.stderr.startsWith('CW-E13')).toBe(false)
      expect(result.code).toBe(1)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it.each([
    ['dist/ removed entirely', async (pkg) => rm(pkg.distPath, { recursive: true, force: true })],
    ['dist/fork-init.mjs has a syntax error', async (pkg) => writeFile(join(pkg.distPath, 'fork-init.mjs'), 'export const BROKEN = (\n')],
  ])('control (f): %s, LANG=zh_TW.UTF-8 with --lang en still prints CW-E13 in zh-TW', async (_label, breakDist) => {
    const pkg = await getPackage()
    await breakDist(pkg)

    const cwd = await makeTmpRoot('create-wxl-bin-cwd-')
    try {
      const result = await spawnBin(pkg.binPath, ['s8', '--no-setup', '--lang', 'en'], { cwd, env: envFor('zh_TW.UTF-8') })

      expect(result.stderr).toBe(zhTW['CW-E13']() + '\n')
      expect(result.code).toBe(1)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  // Stage 6/7 fix assignment section A (ticket's "increment plan confirmed" comment; traceability
  // 0005-S1's own dependency list for the bin).
  it('passes signals: process (the seam\'s own dependency) rather than re-emitting from its own process.on handlers', async () => {
    const source = await readFile(BIN_SOURCE_PATH, 'utf8')
    // The bug this replaces: `process.on(name, () => signals.emit(name))` for a private
    // EventEmitter, registered before `run()` (and its guard) exists -- which both suppresses
    // Node's own default SIGINT/SIGTERM/SIGHUP termination during steps 1-2 and leaves no
    // listener behind to receive the signal once it happens.
    expect(source).not.toMatch(/process\.on\(\s*name/)
    expect(source).not.toMatch(/new EventEmitter\(\)/)
    expect(source).toMatch(/signals:\s*process\b/)
  })

  it('main() is wrapped in a .catch that prints CW-E14 and sets exitCode, instead of leaving an outer error unhandled', async () => {
    const source = await readFile(BIN_SOURCE_PATH, 'utf8')
    expect(source).toMatch(/main\(\)\s*\.catch\(/)
  })

  it('a broken package.json (outside run()) still prints CW-E14 and exits 1, not a raw stack trace', async () => {
    const pkg = await getPackage()
    await writeFile(join(pkg.packageDir, 'package.json'), '{ not json')

    const cwd = await makeTmpRoot('create-wxl-bin-cwd-')
    try {
      const result = await spawnBin(pkg.binPath, ['s8', '--no-setup'], { cwd, env: envFor('en_US') })

      expect(result.code).toBe(1)
      expect(result.stderr.startsWith('CW-E14')).toBe(true)
      expect(result.stdout).toBe('')
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })

  it('the too-old-Node report reuses node-version.mjs, language.mjs and messages.mjs instead of duplicating their logic', async () => {
    const source = await readFile(BIN_SOURCE_PATH, 'utf8')
    // The minimum version and the CW-E01 text live in exactly one place each (node-version.mjs,
    // messages.mjs) -- not re-typed here, where only one copy could get updated and the two
    // would silently disagree.
    expect(source).toMatch(/import\(\s*['"]\.\.\/src\/node-version\.mjs['"]\s*\)/)
    expect(source).toMatch(/import\(\s*['"]\.\.\/src\/messages\.mjs['"]\s*\)/)
    expect(source).toMatch(/messages\[lang\]\[['"]CW-E01['"]\]/)
    // The language choice reuses language.mjs's own rule (LC_ALL/LC_MESSAGES/LANG, then Intl's
    // locale), rather than a hand-rolled fallback that stops at 'en'.
    expect(source).toMatch(/import\(\s*['"]\.\.\/src\/language\.mjs['"]\s*\)/)
    expect(source).toMatch(/selectLanguage\(/)
  })
})
