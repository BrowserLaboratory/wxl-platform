// The pristine-fixture entry list shared by create-wxl's tests (T-0020's Notes). All LF line
// endings; P1/P2/P3 rules are exercised against these exact contents.

import * as engineModule from '../../../scripts/fork-init.ts'

export const CHANGELOG_CONTENT = ['# Changelog', '', '## [Unreleased]', '', '## [1.0.0] - 2024-01-01', '- Initial release', ''].join(
  '\n',
)

export const CHANGELOG_PRISTINE = ['# Changelog', '', '## [Unreleased]', ''].join('\n')

export const OPEN_QUESTIONS_CONTENT = [
  '# Open Questions',
  '',
  'Track open questions here.',
  '',
  '---',
  '',
  '## OQ-001 — Example question?',
  '',
  'Some body text.',
  '',
].join('\n')

export const OPEN_QUESTIONS_PRISTINE = ['# Open Questions', '', 'Track open questions here.', ''].join('\n')

export const PACKAGE_JSON_CONTENT = JSON.stringify({ name: 'wxl', version: '3.0.0' }, null, 2) + '\n'

export const README_CONTENT = '# wxl\n\nA pristine range fixture.\n'

export const NESTED_FILE_CONTENT = "export const hello = 'world'\n"

/** Entries without the archive's GitHub-style prefix. */
export const PRISTINE_FIXTURE = [
  { path: 'CHANGELOG.md', type: 'file', mode: 0o644, content: CHANGELOG_CONTENT },
  { path: '.proj.specs/', type: 'dir', mode: 0o755 },
  { path: '.proj.specs/OPEN-QUESTIONS.md', type: 'file', mode: 0o644, content: OPEN_QUESTIONS_CONTENT },
  { path: 'package.json', type: 'file', mode: 0o644, content: PACKAGE_JSON_CONTENT },
  { path: 'README.md', type: 'file', mode: 0o644, content: README_CONTENT },
  { path: 'src/', type: 'dir', mode: 0o755 },
  { path: 'src/index.js', type: 'file', mode: 0o644, content: NESTED_FILE_CONTENT },
]

// ─── engine-ready fixture (T-0022): a pristine archive that also passes T-0021's entry rules and
// P1-P4 AND the real fork-init engine's A1/A6-A9 checks, so step 11's `runForkInit` succeeds
// against it. Never spells the upstream repository slug: built from `UPSTREAM_SLUG`.

const UPSTREAM_SLUG = engineModule.UPSTREAM_SLUG
const { A9_UPSTREAM_LINE } = engineModule

export const ENGINE_READY_PACKAGE_JSON_CONTENT =
  JSON.stringify(
    {
      name: 'wxl',
      version: '3.0.0',
      author: 'Upstream Author',
      repository: { type: 'git', url: `git+https://github.com/${UPSTREAM_SLUG}.git` },
      bugs: { url: `https://github.com/${UPSTREAM_SLUG}/issues` },
      homepage: `https://github.com/${UPSTREAM_SLUG}#readme`,
    },
    null,
    2,
  ) + '\n'

/** `.vitepress/config.mts`: A9 in its upstream form, the required `  base: siteBase,` line, and
 * exactly one A6 candidate line (`  title: '...',`). */
export const ENGINE_READY_CONFIG_CONTENT = [
  A9_UPSTREAM_LINE,
  '',
  'export default {',
  `  title: 'WXL',`,
  '  base: siteBase,',
  '}',
  '',
].join('\n')

/** The same config, missing the A9 line entirely (C33's row 19(a): the real engine returns a
 * tree error, `exitCode` 1, when `--host` is given and A9/base aren't both found). */
export const ENGINE_READY_CONFIG_NO_A9_CONTENT = [
  'export default {',
  `  title: 'WXL',`,
  '  base: siteBase,',
  '}',
  '',
].join('\n')

export const ENGINE_READY_SHORT_LINK_CONTENT = "export const SITE_ORIGIN = 'https://wxl.browserlab.online'\n"

function heroPage(tagline) {
  return ['---', 'hero:', '  name: "WXL"', `  tagline: "${tagline}"`, '---', '', '# Home', ''].join('\n')
}

export const ENGINE_READY_PLATFORM_INDEX_CONTENT = heroPage('Browser-based web exploitation challenge platform')
export const ENGINE_READY_PLATFORM_INDEX_ZH_CONTENT = heroPage('完全基於前端 WASM 的 Web 資安挑戰平台')

/** LF, derives SITE_BASE (a `configure-pages` step before a `pnpm build` step setting it), and
 * does not match any hash in `KNOWN_OLD_DEPLOY_SHA256` (test/engine-apply.test.mjs compares the
 * installed `.github/workflows/deploy.yml` byte-for-byte against this). */
export const ENGINE_READY_DEPLOY_TEMPLATE_CONTENT = [
  '# WXL fork deploy — from scripts/templates/deploy.yml.template',
  'name: Deploy',
  'jobs:',
  '  build:',
  '    steps:',
  '      - name: Configure Pages',
  '        id: pages',
  '        uses: actions/configure-pages@test',
  '      - name: Build',
  '        env:',
  '          SITE_BASE: ${{ steps.pages.outputs.base_path }}/',
  '        run: pnpm build',
  '',
].join('\n')

const README_WITH_ANCHORS_CONTENT =
  `[![Quality Gates](https://github.com/${UPSTREAM_SLUG}/actions/workflows/quality-gates.yml/badge.svg)]` +
  `(https://github.com/${UPSTREAM_SLUG}/actions/workflows/quality-gates.yml)\n` +
  `git clone https://github.com/${UPSTREAM_SLUG}.git\n`

const CONTRIBUTE_WITH_ANCHORS_CONTENT =
  `git remote add upstream https://github.com/${UPSTREAM_SLUG}.git\n` +
  `Found a bug? Open a [GitHub Issues](https://github.com/${UPSTREAM_SLUG}/issues) entry.\n`

/** Entries without the archive's GitHub-style prefix (T-0022 Notes (1)): passes T-0021's entry
 * rules and P1-P4, and the real engine's A1, A6-A9 checks and workflow install for either host.
 * Directory entries precede the files and sub-directories they contain, in archive order. */
export const ENGINE_READY_FIXTURE = [
  { path: 'CHANGELOG.md', type: 'file', mode: 0o644, content: CHANGELOG_CONTENT },
  { path: '.proj.specs/', type: 'dir', mode: 0o755 },
  { path: '.proj.specs/OPEN-QUESTIONS.md', type: 'file', mode: 0o644, content: OPEN_QUESTIONS_CONTENT },
  { path: 'package.json', type: 'file', mode: 0o644, content: ENGINE_READY_PACKAGE_JSON_CONTENT },
  { path: 'README.md', type: 'file', mode: 0o644, content: README_WITH_ANCHORS_CONTENT },
  { path: 'README.en.md', type: 'file', mode: 0o644, content: README_WITH_ANCHORS_CONTENT },
  { path: 'CONTRIBUTE.md', type: 'file', mode: 0o644, content: CONTRIBUTE_WITH_ANCHORS_CONTENT },
  { path: '.vitepress/', type: 'dir', mode: 0o755 },
  { path: '.vitepress/config.mts', type: 'file', mode: 0o644, content: ENGINE_READY_CONFIG_CONTENT },
  { path: '.vitepress/challenge/', type: 'dir', mode: 0o755 },
  { path: '.vitepress/challenge/shortLink.ts', type: 'file', mode: 0o644, content: ENGINE_READY_SHORT_LINK_CONTENT },
  { path: 'platform/', type: 'dir', mode: 0o755 },
  { path: 'platform/index.md', type: 'file', mode: 0o644, content: ENGINE_READY_PLATFORM_INDEX_CONTENT },
  { path: 'platform/zh-TW/', type: 'dir', mode: 0o755 },
  { path: 'platform/zh-TW/index.md', type: 'file', mode: 0o644, content: ENGINE_READY_PLATFORM_INDEX_ZH_CONTENT },
  { path: 'scripts/', type: 'dir', mode: 0o755 },
  { path: 'scripts/templates/', type: 'dir', mode: 0o755 },
  { path: 'scripts/templates/deploy.yml.template', type: 'file', mode: 0o644, content: ENGINE_READY_DEPLOY_TEMPLATE_CONTENT },
]

/** C33 row 19(a): `.vitepress/config.mts` without the A9 line — `--host` then has no base
 * definition to reset, so the real engine returns a tree error (`exitCode` 1). */
export const ENGINE_READY_FIXTURE_NO_A9 = ENGINE_READY_FIXTURE.map((entry) =>
  entry.path === '.vitepress/config.mts' ? { ...entry, content: ENGINE_READY_CONFIG_NO_A9_CONTENT } : entry,
)

/** C34 row 20: without README.md, README.en.md and CONTRIBUTE.md, so A2-A5 each warn "is
 * missing" (on top of the GitHub Pages tag-rule warning), giving `result.warnings.length > 0`. */
export const ENGINE_READY_FIXTURE_NO_README = ENGINE_READY_FIXTURE.filter(
  (entry) => !['README.md', 'README.en.md', 'CONTRIBUTE.md'].includes(entry.path),
)
