import { describe, it, expect, afterAll } from 'vitest'
import { readFileSync, mkdtempSync, mkdirSync, cpSync, copyFileSync, writeFileSync, symlinkSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'

// D124 / U139 / U136 / B95: in a range (`/create-wxl export-ignore`, a root range.json) the upstream-only
// tests report skipped, never failed. The files are run by a second vitest in a copy of this tree
// that has no `create-wxl/`, because a `describe.skipIf` body and a literal `import()` specifier are
// both evaluated before any skip applies.

const REPO_ROOT = resolve(__dirname, '../../..')
const UPSTREAM_ONLY_FILES = ['tests/unit/site/source-layout.test.ts', 'tests/unit/site/upstream-equality.test.ts', 'tests/unit/site/layout-error.test.ts', 'tests/unit/site/config-base.test.ts']

let root: string | undefined
afterAll(() => {
  if (root !== undefined) rmSync(root, { recursive: true, force: true })
})

function buildRangeCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), 'wxl-range-collection-'))
  for (const tree of ['.vitepress', 'platform', 'scripts', 'tests/__helpers__', 'tests/__mocks__']) {
    cpSync(resolve(REPO_ROOT, tree), join(dir, tree), {
      recursive: true,
      filter: (src) => !/[\\/]\.vitepress[\\/](cache|dist)$/.test(src),
    })
  }
  for (const file of ['vitest.config.ts', 'package.json', 'tests/setup.ts', ...UPSTREAM_ONLY_FILES]) {
    mkdirSync(dirname(join(dir, file)), { recursive: true })
    copyFileSync(resolve(REPO_ROOT, file), join(dir, file))
  }
  writeFileSync(join(dir, 'range.json'), '{"primaryLocale":"en"}\n')
  symlinkSync(resolve(REPO_ROOT, 'node_modules'), join(dir, 'node_modules'), 'junction')
  return dir
}

interface JsonReport {
  success: boolean
  numFailedTestSuites: number
  numFailedTests: number
  testResults: Array<{ name: string; status: string; message: string; assertionResults: Array<{ fullName: string; status: string }> }>
}

describe('a range collects the upstream-only test files without failing (D124, U136, U139, B95)', () => {
  it('every listed file passes, and its upstream-only suites report skipped', () => {
    root = buildRangeCopy()
    expect(existsSync(join(root, 'create-wxl'))).toBe(false)
    const env: NodeJS.ProcessEnv = { ...process.env }
    for (const key of Object.keys(env)) if (key.startsWith('VITEST')) delete env[key]
    delete env.GITHUB_REPOSITORY
    delete env.WXL_EXPECT_UPSTREAM
    const outputFile = join(root, 'report.json')
    const res = spawnSync(
      process.execPath,
      [resolve(REPO_ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...UPSTREAM_ONLY_FILES, '--reporter=json', `--outputFile=${outputFile}`],
      { cwd: root, env, encoding: 'utf8' },
    )
    const report = JSON.parse(readFileSync(outputFile, 'utf8')) as JsonReport
    const failures = report.testResults.filter((file) => file.status !== 'passed').map((file) => `${file.name}: ${file.message}`)
    expect(failures, res.stderr).toEqual([])
    expect(report.testResults.length).toBe(UPSTREAM_ONLY_FILES.length)
    expect(res.status).toBe(0)
    const all = report.testResults.flatMap((file) => file.assertionResults)
    const upstreamOnly = all.filter((t) => /(?:^| )(U136:|0010-S49:|jsonStringifyEscaped equals create-wxl|B14: real tree|B47: the real tree|B60: title and description)/.test(t.fullName))
    expect(upstreamOnly.length).toBeGreaterThan(0)
    expect(upstreamOnly.filter((t) => t.status === 'passed' || t.status === 'failed')).toEqual([])
  }, 120_000)
})
