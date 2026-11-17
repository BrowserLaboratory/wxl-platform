import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'

// L47 (D49): a production build must ship no `smoke-fixtures` string. The theme is the client
// bundle's entry, so nothing reachable from `.vitepress/theme/index.ts` may name the folder or
// import the module (`.vitepress/pageList.ts`) that holds the predicate. The graph is walked from
// source with a small resolver (no bundler): relative static imports and `export … from` edges,
// plus dynamic `import()`; an edge that carries only types is erased by the build and not walked.

const REPO_ROOT = resolve(__dirname, '../../..')
const ENTRY = join(REPO_ROOT, '.vitepress/theme/index.ts')
// The spelling is built from parts so this file is not itself a carrier of the literal.
const LITERAL = ['smoke', 'fixtures'].join('-')
const EXTENSIONS = ['', '.ts', '.mts', '.js', '.vue', '/index.ts', '/index.js']

/** The code a file contributes to the bundle: a `.vue` file's `<script>` blocks, else the file. */
function codeOf(file: string, text: string): string {
  if (!file.endsWith('.vue')) return text
  return [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
}

/** Specifiers of the edges a bundler follows: not `import type`, not an import of only `type` names. */
function edgesOf(code: string): string[] {
  const edges: string[] = []
  const staticRe = /\b(import|export)\s+(type\s+)?([^'";]*?)\s*from\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g
  for (const m of code.matchAll(staticRe)) {
    if (m[5] !== undefined) {
      edges.push(m[5])
      continue
    }
    if (m[2] !== undefined) continue
    const clause = m[3].trim()
    const named = clause.match(/^\{([\s\S]*)\}$/)
    if (named) {
      const names = named[1].split(',').map((n) => n.trim()).filter(Boolean)
      if (names.length > 0 && names.every((n) => /^type\s/.test(n))) continue
    }
    edges.push(m[4])
  }
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) edges.push(m[1])
  return edges
}

function resolveFile(from: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined
  const base = resolve(dirname(from), specifier.replace(/\?.*$/, ''))
  for (const ext of EXTENSIONS) {
    const candidate = base + ext
    if (existsSync(candidate) && statSync(candidate).isFile() && /\.(ts|mts|js|vue)$/.test(candidate)) return candidate
  }
  return undefined
}

/** Every source file reachable from `entry`, with its full text. */
function walkGraph(entry: string): Map<string, string> {
  const seen = new Map<string, string>()
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.pop()!
    if (seen.has(file)) continue
    const text = readFileSync(file, 'utf8')
    seen.set(file, text)
    for (const specifier of edgesOf(codeOf(file, text))) {
      const next = resolveFile(file, specifier)
      if (next !== undefined && !seen.has(next)) queue.push(next)
    }
  }
  return seen
}

const rel = (file: string) => relative(REPO_ROOT, file).split('\\').join('/')

describe('the client bundle graph names no smoke fixture (L47)', () => {
  const graph = walkGraph(ENTRY)
  const files = [...graph.keys()].map(rel)

  it('does not reach the module that exports isSmokeFixturePage', () => {
    expect(files).not.toContain('.vitepress/pageList.ts')
  })

  it('has no reached file whose text contains the folder name', () => {
    const carriers = [...graph].filter(([, text]) => text.includes(LITERAL)).map(([file]) => rel(file))
    expect(carriers).toEqual([])
  })

  it('is a real walk: many files, including known members', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files).toContain('.vitepress/theme/index.ts')
    expect(files).toContain('.vitepress/theme/i18n/pages.ts')
    expect(files).toContain('.vitepress/locales.ts')
  })
})

describe('the resolver, on a temporary graph', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  function temporaryGraph(): string {
    const dir = mkdtempSync(join(tmpdir(), 'wxl-client-graph-'))
    dirs.push(dir)
    mkdirSync(join(dir, 'lib'))
    const carrier = `export const x = '${LITERAL}'\n`
    writeFileSync(join(dir, 'entry.ts'), [
      "import type { A } from './types-only.ts'",
      "import { type B, type C } from './named-types.ts'",
      "import { real } from './static.ts'",
      "export const later = () => import('./lib/dynamic')",
      "export * from './component.vue'",
    ].join('\n'))
    writeFileSync(join(dir, 'types-only.ts'), carrier)
    writeFileSync(join(dir, 'named-types.ts'), carrier)
    writeFileSync(join(dir, 'static.ts'), 'export const real = 1\n')
    writeFileSync(join(dir, 'lib/dynamic.ts'), carrier)
    writeFileSync(join(dir, 'component.vue'), `<template><p>${LITERAL}</p></template>\n<script setup lang="ts">\nimport { w } from './vue-edge.ts'\n</script>\n`)
    writeFileSync(join(dir, 'vue-edge.ts'), carrier)
    return dir
  }

  it('follows a dynamic import(), a static edge and a .vue script edge; skips type-only edges', () => {
    const dir = temporaryGraph()
    const reached = [...walkGraph(join(dir, 'entry.ts')).keys()].map((file) => relative(dir, file))
    expect(reached.sort()).toEqual(['component.vue', 'entry.ts', 'lib/dynamic.ts', 'static.ts', 'vue-edge.ts'])
  })

  it('so the walk finds the carrier behind the dynamic import and not the one behind import type', () => {
    const dir = temporaryGraph()
    const carriers = [...walkGraph(join(dir, 'entry.ts'))]
      .filter(([, text]) => text.includes(LITERAL))
      .map(([file]) => relative(dir, file))
    expect(carriers).toContain('lib/dynamic.ts')
    expect(carriers).not.toContain('types-only.ts')
    expect(carriers).not.toContain('named-types.ts')
  })
})
