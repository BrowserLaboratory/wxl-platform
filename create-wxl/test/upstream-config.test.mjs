// "Upstream configuration" (traceability.md 0005-S3): U2 (the create-wxl package manifest,
// `.gitignore`, lockfile), U3 (CI), U4-U10 (the documents). Deviation from the approved test plan
// table (recorded in the ticket's "increment plan confirmed" comment): this file is `.mjs`, not
// `.ts` -- vitest's `include` (`vitest.config.mjs:6`) only collects `test/**/*.test.mjs`.

import { describe, it, expect } from 'vitest'
import { readFile, mkdtemp, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { UPSTREAM_SLUG } from '../../scripts/fork-init.ts'

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const CREATE_WXL_PKG_PATH = join(REPO_ROOT, 'create-wxl/package.json')
const ROOT_PKG_PATH = join(REPO_ROOT, 'package.json')
const CREATE_WXL_GITIGNORE_PATH = join(REPO_ROOT, 'create-wxl/.gitignore')
const QUALITY_GATES_PATH = join(REPO_ROOT, '.github/workflows/quality-gates.yml')
const [UPSTREAM_OWNER, UPSTREAM_NAME] = UPSTREAM_SLUG.split('/')

function runGit(args, { cwd, env = process.env }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', args, { cwd, env, shell: false })
    let stdout = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.on('error', reject)
    child.on('close', (code) => resolvePromise({ code, stdout }))
  })
}

const EXACT_VERSION_RE = /^\d+\.\d+\.\d+$/

describe('C45: manifest matches U2 listing', () => {
  it('create-wxl/package.json is exactly the listing apart from the four placeholders', async () => {
    const createWxlPkg = JSON.parse(await readFile(CREATE_WXL_PKG_PATH, 'utf8'))
    const rootPkg = JSON.parse(await readFile(ROOT_PKG_PATH, 'utf8'))

    const expected = {
      name: 'create-wxl',
      version: rootPkg.version,
      description: 'Create a Web eXploitation Laboratory range',
      type: 'module',
      bin: { 'create-wxl': 'bin/create-wxl.mjs' },
      files: ['bin', 'src', 'dist', 'LICENSE'],
      engines: { node: '>=22.6.0' },
      license: 'LicenseRef-LICENSE',
      dependencies: { tar: createWxlPkg.dependencies?.tar, yaml: createWxlPkg.dependencies?.yaml },
      devDependencies: { vitest: createWxlPkg.devDependencies?.vitest },
      scripts: {
        prepack: 'node scripts/prepare-dist.mjs',
        prepublishOnly: 'node scripts/prepare-dist.mjs && node scripts/check-publish.mjs',
        test: 'vitest run',
      },
    }

    // `JSON.stringify` (not `toStrictEqual`, ticket "increment plan confirmed": "C45 compares
    // key order"): the listing's key order matters
    // too (`bin` right after `type`; `scripts` in the order prepack, prepublishOnly, test), and
    // `toStrictEqual` does not check it.
    expect(JSON.stringify(createWxlPkg)).toBe(JSON.stringify(expected))

    expect(createWxlPkg.version).toBe(rootPkg.version)
    expect(createWxlPkg.version).toMatch(EXACT_VERSION_RE)
    expect(createWxlPkg.dependencies.tar).toMatch(EXACT_VERSION_RE)
    expect(createWxlPkg.dependencies.yaml).toMatch(EXACT_VERSION_RE)
    expect(createWxlPkg.devDependencies.vitest).toMatch(EXACT_VERSION_RE)
  })
})

describe('C45: .gitignore lists four items, lockfile tracked', () => {
  it('create-wxl/.gitignore has its own line for dist/, node_modules/, LICENSE and *.tgz', async () => {
    const content = await readFile(CREATE_WXL_GITIGNORE_PATH, 'utf8')
    const lines = content.split('\n')
    for (const entry of ['dist/', 'node_modules/', 'LICENSE', '*.tgz']) {
      expect(lines, `create-wxl/.gitignore is missing its own line for ${entry}`).toContain(entry)
    }
  })

  // P-14/S-14: title matches what is actually asserted (it is not about package.json); runs with
  // an isolated env (a throwaway HOME, GIT_CONFIG_NOSYSTEM=1) so the real repository's own global
  // git config, or a stray GIT_DIR/GIT_INDEX_FILE from an outer git hook, cannot change the
  // tracked-file list this reads.
  it('create-wxl/pnpm-lock.yaml and create-wxl/.gitignore are tracked', async () => {
    const isolatedHome = await mkdtemp(join(tmpdir(), 'create-wxl-upstream-config-git-home-'))
    try {
      const env = { HOME: isolatedHome, XDG_CONFIG_HOME: isolatedHome, PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1' }
      const result = await runGit(['ls-files', 'create-wxl/pnpm-lock.yaml', 'create-wxl/.gitignore'], { cwd: REPO_ROOT, env })
      expect(result.code).toBe(0)
      const tracked = result.stdout.split('\n').filter((line) => line !== '')
      expect(new Set(tracked)).toEqual(new Set(['create-wxl/pnpm-lock.yaml', 'create-wxl/.gitignore']))
    } finally {
      await rm(isolatedHome, { recursive: true, force: true })
    }
  })
})

describe('C46: fork-init-cross-os has a new step after the existing test step', () => {
  async function forkInitCrossOsJob() {
    const doc = parseYaml(await readFile(QUALITY_GATES_PATH, 'utf8'))
    return doc.jobs['fork-init-cross-os']
  }

  it('the existing step is unchanged', async () => {
    const job = await forkInitCrossOsJob()
    const existing = job.steps.find((step) => step.name === 'Run fork-init and upstream-guard tests')
    expect(existing).toBeDefined()
    expect(existing.run).toBe('pnpm vitest run tests/unit/scripts/fork-init.test.ts tests/unit/scripts/upstream-guard.test.ts')
  })

  it("job if: is unchanged", async () => {
    const job = await forkInitCrossOsJob()
    expect(job.if).toBe(`github.repository == format('{0}/{1}', '${UPSTREAM_OWNER}', '${UPSTREAM_NAME}')`)
  })

  it('a new step "Run create-wxl tests" runs exactly the create-wxl install and test command, after the existing step', async () => {
    const job = await forkInitCrossOsJob()
    const existingIndex = job.steps.findIndex((step) => step.name === 'Run fork-init and upstream-guard tests')
    const newIndex = job.steps.findIndex((step) => step.name === 'Run create-wxl tests')
    expect(newIndex, 'no step named "Run create-wxl tests"').toBeGreaterThan(-1)
    expect(newIndex).toBeGreaterThan(existingIndex)
    expect(job.steps[newIndex].run).toBe('pnpm --dir create-wxl install --frozen-lockfile && pnpm --dir create-wxl test')
  })
})

/** `grep -F` after collapsing whitespace runs to one space (traceability.md "Upstream
 * configuration": "Each item's strings are checked with grep -F after collapsing runs of
 * whitespace to one space"). */
function collapsedWhitespace(text) {
  return text.replace(/\s+/g, ' ')
}

describe('U4-U10', () => {
  it('U4: Charter Serves and Must lines are revised; "stay forkable" is gone', async () => {
    const agents = collapsedWhitespace(await readFile(join(REPO_ROOT, 'AGENTS.md'), 'utf8'))
    expect(agents).toContain(
      collapsedWhitespace('- **Serves:** teachers who start a range of their own from it, and their students.'),
    )
    expect(agents).toContain(
      collapsedWhitespace(
        '- **Must:** run entirely in the browser; keep each learner\'s work on the learner\'s own machine; ' +
          'stay easy to start and to upgrade: `npm create wxl` (or a fork with `pnpm fork:init`) and a static ' +
          'host (Cloudflare Pages or GitHub Pages) are all a teacher needs, and a range can take in later ' +
          'upstream releases.',
      ),
    )
    expect(agents).not.toContain('stay forkable')
  })

  /** The subsection's own text: from its heading to the next `##`/`###` heading. */
  function extractSection(content, headingLine) {
    const start = content.indexOf(headingLine)
    expect(start, `heading not found: ${headingLine}`).toBeGreaterThan(-1)
    const rest = content.slice(start + headingLine.length)
    const next = rest.search(/\n#{2,3} /)
    return rest.slice(0, next === -1 ? undefined : next)
  }

  it('U5: README.md gains the npm create wxl mention and subsection', async () => {
    const readme = await readFile(join(REPO_ROOT, 'README.md'), 'utf8')

    // P-13/S-12: inside ## 簡介 specifically, not merely somewhere in the collapsed file (the new
    // subsection itself also contains `npm create wxl`, which would make a whole-file toContain
    // pass even if this sentence moved out of the introduction).
    const introSection = collapsedWhitespace(extractSection(readme, '## 簡介'))
    expect(introSection).toContain(collapsedWhitespace('或執行 `npm create wxl`'))

    const heading = '### 用 `npm create wxl` 建立靶場'
    expect(readme).toContain(heading)
    // Positioned after the Deployment heading and before the fork subsection.
    expect(readme.indexOf('## 部署')).toBeLessThan(readme.indexOf(heading))
    expect(readme.indexOf(heading)).toBeLessThan(readme.indexOf('### fork 之後：改寫專案身分'))

    const section = extractSection(readme, heading)
    for (const text of [
      'npm create wxl <資料夾>',
      'pnpm create wxl <資料夾>',
      'npm create wxl <資料夾> -- --no-setup',
      'Node.js >= 22.6',
      'range.json',
      '設定紀錄',
      '作者',
      'GitHub repository',
      '部署主機',
      '網站網址',
      '網站名稱',
    ]) {
      expect(section, `README.md's new subsection is missing ${JSON.stringify(text)}`).toContain(text)
    }
    // No still-coined term inside the new subsection (GLOSSARY.md: 原廠靶場, 開發模組).
    expect(section).not.toContain('原廠靶場')
    expect(section).not.toContain('開發模組')

    // S-18: 資料夾 throughout (matching the CLI's own CW-E03 wording), not mixed with 目錄.
    expect(section).not.toContain('目錄')
    // S-20: the non-interactive flag form, and a note that the command needs create-wxl
    // published first (this README merges before that happens).
    expect(section).toMatch(/--author[^\n]*--repo[^\n]*--host/)
    expect(section).toContain('發布')

    expect(readme).not.toMatch(/"upstream"\s*:/)
  })

  it('U5: README.en.md gains the npm create wxl mention and subsection', async () => {
    const readme = await readFile(join(REPO_ROOT, 'README.en.md'), 'utf8')

    // P-13/S-12: inside ## Overview specifically (see the README.md test's own note).
    const overviewSection = collapsedWhitespace(extractSection(readme, '## Overview'))
    expect(overviewSection).toContain(collapsedWhitespace('or run `npm create wxl`'))

    const heading = '### Create a range with `npm create wxl`'
    expect(readme).toContain(heading)

    const section = extractSection(readme, heading)
    for (const text of [
      'npm create wxl <folder>',
      'pnpm create wxl <folder>',
      'npm create wxl <folder> -- --no-setup',
      'Node.js >= 22.6',
      'range.json',
      'setup record',
      'author',
      'GitHub repository',
      'host',
      'site address',
      'site name',
    ]) {
      expect(section, `README.en.md's new subsection is missing ${JSON.stringify(text)}`).toContain(text)
    }
    expect(section).not.toContain('pristine range')
    expect(section).not.toContain('dev module')

    // S-20: the non-interactive flag form, and a note that the command needs create-wxl
    // published first.
    expect(section).toMatch(/--author[^\n]*--repo[^\n]*--host/)
    expect(section).toMatch(/publish(ed)?/)

    expect(readme).not.toMatch(/"upstream"\s*:/)
  })

  it('U5/U10: the setup record glossary entry drops its _新造詞_ line (README now uses the term)', async () => {
    const glossary = await readFile(join(REPO_ROOT, 'GLOSSARY.md'), 'utf8')
    const start = glossary.indexOf('**setup record（設定紀錄）**:')
    expect(start, 'setup record entry not found').toBeGreaterThan(-1)
    const rest = glossary.slice(start)
    const nextTermIndex = rest.slice(1).search(/\*\*[^*]+\*\*\s*[:：]\s*\n/)
    const entry = rest.slice(0, nextTermIndex === -1 ? undefined : nextTermIndex + 1)
    expect(entry).not.toMatch(/^_新造詞_/m)
  })

  describe('U6-U8: three new open questions', () => {
    const headings = {
      'OQ-020': '## OQ-020 — When do the settings half of the setup record and the setup page land?',
      'OQ-021':
        "## OQ-021 — Do `npm create wxl -- <flags>` and `pnpm range:upgrade` work through the registry on the npm and pnpm versions teachers use?",
      'OQ-022': '## OQ-022 — Is a terminal run of the packed package adequate stage 8 for create-wxl?',
    }

    /** From an `## OQ-###` heading line to the next one (or EOF). */
    function extractEntry(content, headingLine) {
      const start = content.indexOf(headingLine)
      expect(start, `heading not found: ${headingLine}`).toBeGreaterThan(-1)
      const rest = content.slice(start)
      const next = rest.slice(1).search(/\n## OQ-\d{3} /)
      return rest.slice(0, next === -1 ? undefined : next + 1)
    }

    it.each(Object.entries(headings))('has the %s heading verbatim', async (_id, headingLine) => {
      const content = await readFile(join(REPO_ROOT, '.proj.specs/OPEN-QUESTIONS.md'), 'utf8')
      expect(content.split('\n')).toContain(headingLine)
    })

    it('OQ-020 names epics 0006, 0007, 0008 and 0004', async () => {
      const content = await readFile(join(REPO_ROOT, '.proj.specs/OPEN-QUESTIONS.md'), 'utf8')
      const entry = extractEntry(content, headings['OQ-020'])
      for (const epic of ['0006', '0007', '0008', '0004']) {
        expect(entry, `OQ-020 is missing epic ${epic}`).toContain(epic)
      }
    })

    it('OQ-022 names epics 0005 and 0006', async () => {
      const content = await readFile(join(REPO_ROOT, '.proj.specs/OPEN-QUESTIONS.md'), 'utf8')
      const entry = extractEntry(content, headings['OQ-022'])
      for (const epic of ['0005', '0006']) {
        expect(entry, `OQ-022 is missing epic ${epic}`).toContain(epic)
      }
    })

    it.each(Object.values(headings))('%s entry has the standard field set', async (headingLine) => {
      const content = await readFile(join(REPO_ROOT, '.proj.specs/OPEN-QUESTIONS.md'), 'utf8')
      const entry = extractEntry(content, headingLine)
      for (const field of ['**Deferred on:**', '**Status:**', '**Reason.**', '**Evidence.**', '**Blocks.**', '**Not blocked.**', '**Revisit when.**']) {
        expect(entry, `entry for ${headingLine} is missing ${field}`).toContain(field)
      }
    })
  })

  it('U9 (new): quality-gates.yml comments on fork-init-cross-os mention create-wxl', async () => {
    const content = await readFile(QUALITY_GATES_PATH, 'utf8')
    const start = content.indexOf('fork-init-cross-os:')
    expect(start).toBeGreaterThan(-1)
    const ifIndex = content.indexOf('if:', start)
    const commentBlock = content.slice(start, ifIndex)
    expect(commentBlock).toContain('create-wxl')
  })

  it('U9 (new): AGENTS.md repository layout lists create-wxl/', async () => {
    const agents = await readFile(join(REPO_ROOT, 'AGENTS.md'), 'utf8')
    const layoutStart = agents.indexOf('## Repository layout')
    const layoutEnd = agents.indexOf('## Build and test commands')
    const layoutBlock = agents.slice(layoutStart, layoutEnd)
    expect(layoutBlock.split('\n').some((line) => line.trim().startsWith('create-wxl/'))).toBe(true)
  })

  it('U9 (new): AGENTS.md build-and-test list names pnpm --dir create-wxl test', async () => {
    const agents = await readFile(join(REPO_ROOT, 'AGENTS.md'), 'utf8')
    const start = agents.indexOf('## Build and test commands')
    expect(start).toBeGreaterThan(-1)
    const nextHeading = agents.slice(start + 1).search(/\n## /)
    const block = agents.slice(start, nextHeading === -1 ? undefined : start + 1 + nextHeading)
    expect(block).toContain('pnpm --dir create-wxl test')
    // S-32/P-27: the "an agent needs and cannot infer" list must also say create-wxl needs its
    // OWN install first (it has its own lockfile; the root pnpm install does not reach it), and
    // that the publish tests need Node >= 22.13 (module.stripTypeScriptTypes) -- both of which an
    // agent running this blind, on an un-installed checkout or an older Node 22, would otherwise
    // only discover by trial and error.
    expect(block).toContain('pnpm --dir create-wxl install --frozen-lockfile')
    expect(block).toMatch(/22\.13/)
  })

  it('U9 (T-0019): the engine header and both skills carry the recorded strings', async () => {
    const engineSource = await readFile(join(REPO_ROOT, 'scripts/fork-init.ts'), 'utf8')
    const headerEnd = engineSource.indexOf(' */')
    const header = engineSource.slice(0, headerEnd)
    expect(header).toContain('create-wxl (the npm package, 0005-create-wxl) carries a type-stripped copy of this file')
    expect(header).toContain("range.json (create-wxl's setup record) is never rewritten in B mode")

    const claudeSkill = await readFile(join(REPO_ROOT, '.claude/skills/wxl-fork-init/SKILL.md'), 'utf8')
    const agentsSkill = await readFile(join(REPO_ROOT, '.agents/skills/wxl-fork-init/SKILL.md'), 'utf8')
    for (const skill of [claudeSkill, agentsSkill]) {
      expect(skill).toContain('根目錄的 `range.json`（create-wxl 建立靶場時寫入的設定紀錄）是例外：兩種模式都不會改寫它')
      expect(skill).toContain('屬於預期結果，不代表殘留未處理')
      expect(skill).toContain('不要手動改掉 `range.json` 的 `upstream.repository`')
    }
    expect(claudeSkill).toBe(agentsSkill)
  })

  /** P-03/S-11: cuts an entry from its own term line up to the NEXT term line (`\n**...**:`), or
   * to the end of the file when there is none -- a fixed `+N` character window (the previous
   * version of this test) can run past the entry it means to isolate, or stop short of it. */
  function cutEntry(glossary, startMarker) {
    const start = glossary.indexOf(startMarker)
    expect(start, `entry not found: ${startMarker}`).toBeGreaterThan(-1)
    const rest = glossary.slice(start + startMarker.length)
    const nextTermOffset = rest.search(/\n\*\*[^*]+\*\*\s*[:：]/)
    return glossary.slice(start, nextTermOffset === -1 ? undefined : start + startMarker.length + nextTermOffset)
  }

  it('U10: 上游/設定紀錄/開發模組/原廠靶場 carry the recorded sentences', async () => {
    const glossary = await readFile(join(REPO_ROOT, 'GLOSSARY.md'), 'utf8')
    const sharedSentence = '設定紀錄出現之前建立的靶場沒有設定紀錄'
    const upstreamEntry = cutEntry(glossary, '**upstream（上游）**:')
    expect(upstreamEntry).toContain(sharedSentence)

    const setupRecordEntry = cutEntry(glossary, '**setup record（設定紀錄）**:')
    expect(setupRecordEntry).toContain(sharedSentence)
    expect(setupRecordEntry).toContain('目前只有建立靶場的指令會寫入它')
    expect(setupRecordEntry).toContain('開發模組照它套用設定是之後的事')

    const devModuleEntry = cutEntry(glossary, '**dev module（開發模組）**:')
    // P-03/S-11: the specific "former meaning" line, not just any `_Avoid_` line -- 開發模組 and
    // 設定紀錄 already had an unrelated `_Avoid_` line each before U10, so a bare `/^_Avoid_/m`
    // stays green even if the 【舊義】 line itself is deleted.
    expect(devModuleEntry).toMatch(/^_Avoid_: 【舊義】/m)
    expect(setupRecordEntry).toMatch(/^_Avoid_: 【舊義】/m)

    const pristineRangeEntry = cutEntry(glossary, '**pristine range（原廠靶場）**:')
    expect(pristineRangeEntry).toMatch(/_Avoid_.*上游自己的「尚未被設定」檢查/)
  })
})
