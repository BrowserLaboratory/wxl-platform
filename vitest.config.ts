import { defineConfig, type Plugin } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { realpathSync } from 'node:fs'

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
  // Vite's dev-server file guard (`server.fs.allow`, default: the project root and its
  // workspace) also gates vite-node's SSR module loader, so a dynamic `import()` of a file
  // outside the repository fails with "Cannot find module" even though it exists and plain
  // Node resolves it fine. The config-base "fixture root" tests (B14, B16, B47) import a copy
  // of `.vitepress/config.mts` from a fresh `os.tmpdir()` directory specifically so each case
  // observes the real module instead of a spy — this allowlists the OS temp directory that holds
  // those fixture roots, not the filesystem root.
  // `os.tmpdir()` is a symlink on macOS (`/var/...` → `/private/var/...`); Vite resolves the
  // requested file before matching it against `allow`, so both forms are listed.
  server: { fs: { allow: ['.', tmpdir(), realpathSync(tmpdir())] } },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.ts', 'chall-wasm/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
})
