import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// SourceViewer.vue loads its CodeMirror modules through dynamic `import()` at runtime, so
// every package it names must live in `dependencies`. A package parked in
// `devDependencies` builds fine under the full install CI uses and only fails under a
// production-only install — which is how `@codemirror/search` slipped through three
// review rounds. This test closes that gap for every bare specifier the component imports.

const root = resolve(__dirname, '../../..')
const sourceViewerVue = readFileSync(
  resolve(root, '.vitepress/theme/components/SourceViewer.vue'),
  'utf-8',
)
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8')) as {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/** Bare package name (`scope/name` or `name`) for every `import('<specifier>')` in the SFC. */
function runtimeImportedPackages(sfc: string): string[] {
  const specifiers = [...sfc.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1])
  const bare = specifiers.filter((s) => !s.startsWith('.') && !s.startsWith('/'))
  const names = bare.map((s) => {
    const parts = s.split('/')
    return s.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
  })
  return [...new Set(names)]
}

describe('SourceViewer runtime imports are declared as runtime dependencies', () => {
  const packages = runtimeImportedPackages(sourceViewerVue)

  it('finds the dynamic imports the component actually makes', () => {
    expect(packages).toContain('@codemirror/search')
    expect(packages).toContain('@codemirror/view')
  })

  it.each(packages)('%s is listed under package.json dependencies', (name) => {
    expect(pkg.dependencies ?? {}).toHaveProperty(name)
    expect(pkg.devDependencies ?? {}).not.toHaveProperty(name)
  })
})
