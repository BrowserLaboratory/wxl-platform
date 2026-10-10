import { defineConfig, type Plugin } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { fileURLToPath } from 'node:url'

// Minimal .md stub for test environment: exports `frontmatter` parsed from YAML front matter.
// Keeps glob imports working without needing the full VitePress markdown pipeline.
function markdownStub(): Plugin {
  return {
    name: 'test-markdown-stub',
    transform(code, id) {
      const base = id.split('?')[0]
      if (!base.endsWith('.md')) return
      const match = code.match(/^---\n([\s\S]*?)\n---/)
      let frontmatter: Record<string, unknown> = {}
      if (match) {
        // Parse simple key: value YAML (sufficient for challenge frontmatter)
        for (const line of match[1].split('\n')) {
          const kv = line.match(/^(\w+):\s*(.+)$/)
          if (kv) frontmatter[kv[1]] = kv[2].replace(/^["']|["']$/g, '')
        }
      }
      return `export const frontmatter = ${JSON.stringify(frontmatter)};\nexport default {};`
    },
  }
}

export default defineConfig({
  plugins: [markdownStub(), vue(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      // Stub the WASM module for unit tests (the file only exists at runtime in /public)
      '/wasm/virtual-fs/virtual_fs.js': fileURLToPath(
        new URL('./tests/__mocks__/virtual-fs.ts', import.meta.url),
      ),
      // `.vitepress/theme/index.ts` imports UnoCSS's virtual module, which only
      // exists inside the VitePress build. Without this alias the theme entry
      // cannot be imported at all, and its locale wiring — the route watcher,
      // the cold-load redirect, the conditional persistence — has no test.
      'virtual:uno.css': fileURLToPath(
        new URL('./tests/__mocks__/empty.css.ts', import.meta.url),
      ),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts', 'chall-wasm/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
})
