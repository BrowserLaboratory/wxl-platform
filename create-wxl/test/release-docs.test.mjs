// Spec 0009-S5 (traceability.md R2, row D01): the release procedure is written down in
// `docs/agents/release.md` and linked from `AGENTS.md` and `CONTRIBUTE.md`. Line checks run on
// lines trimmed and stripped of one leading `| ` or `- `; string checks run after collapsing
// whitespace runs to one space. This file lives in `create-wxl/test/`, so it never enters a range,
// and it never spells the upstream repository slug: it imports `UPSTREAM_SLUG`.

import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { UPSTREAM_SLUG } from '../../scripts/fork-init.ts'

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))
const cache = new Map()
/** Each file is read once and shared by every case below. */
function read(relative) {
  if (!cache.has(relative)) cache.set(relative, readFile(join(REPO_ROOT, relative), 'utf8'))
  return cache.get(relative)
}

/** A line as R2's line checks see it: trimmed, then one leading `| ` or `- ` removed. */
function normaliseLine(line) {
  const trimmed = line.trim()
  if (trimmed.startsWith('| ') || trimmed.startsWith('- ')) return trimmed.slice(2)
  return trimmed
}

const collapse = (text) => text.replace(/\s+/g, ' ')

/** The lines of `## <heading>` up to the next `## ` heading. */
function section(text, heading) {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start === -1) return []
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => line.startsWith('## '))
  return end === -1 ? rest : rest.slice(0, end)
}

const IDS = [
  ...Array.from({ length: 8 }, (_, i) => `RP${i}`),
  ...Array.from({ length: 7 }, (_, i) => `MN${i + 1}`),
  ...Array.from({ length: 7 }, (_, i) => `F${i + 1}`),
]

describe('docs/agents/release.md (0009 R2 line checks)', () => {
  it('opens with the title, then a line saying it applies upstream only', async () => {
    const lines = (await read('docs/agents/release.md')).split('\n')
    expect(lines[0]).toBe('# Releasing create-wxl and WXL')
    const firstAfter = lines.slice(1).find((line) => line.trim() !== '')
    expect(firstAfter).toContain('upstream only')
  })

  // R2's wording lists " |" too; it is covered by "followed by a space" and kept to mirror R2.
  it.each(IDS)('has a line starting with %s followed by a space, ":" or " |"', async (id) => {
    const lines = (await read('docs/agents/release.md')).split('\n').map(normaliseLine)
    expect(lines.some((line) => line.startsWith(`${id} `) || line.startsWith(`${id}:`) || line.startsWith(`${id} |`))).toBe(true)
  })
})

describe('docs/agents/release.md (0009 R2 string checks)', () => {
  it.each([
    '/tw-emoji-release-note',
    'git push origin v<V>',
    'never `git push --tags`',
    'npm stage publish',
    'Staged Packages',
    '2FA',
    'disallow tokens',
    'UPSTREAM_SLUG',
  ])('contains %s', async (needle) => {
    expect(collapse(await read('docs/agents/release.md'))).toContain(needle)
  })

  it('does not spell the upstream slug, in any letter case', async () => {
    const text = (await read('docs/agents/release.md')).toLowerCase()
    expect(text).not.toContain(UPSTREAM_SLUG.toLowerCase())
  })
})

describe('the release document is linked (0009 R2 other files)', () => {
  it("AGENTS.md's Reference section has a line naming docs/agents/release.md", async () => {
    const lines = section(await read('AGENTS.md'), 'Reference')
    expect(lines.some((line) => line.includes('docs/agents/release.md'))).toBe(true)
  })

  it("CONTRIBUTE.md's Maintainer Setup has a line naming docs/agents/release.md and MN2", async () => {
    const lines = section(await read('CONTRIBUTE.md'), 'Maintainer Setup')
    expect(lines.some((line) => line.includes('docs/agents/release.md') && line.includes('MN2'))).toBe(true)
  })
})
