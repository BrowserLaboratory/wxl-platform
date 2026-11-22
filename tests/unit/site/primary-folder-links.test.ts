import { describe, it, expect, beforeEach } from 'vitest'
import { createMarkdownRenderer, disposeMdItInstance } from 'vitepress'
import { primaryFolderLinks } from '../../../.vitepress/primary-folder-links'
import { SiteLayoutError } from '../../../.vitepress/layout-error'

// `createMarkdownRenderer` caches one instance at the module level (VitePress's own build reuses
// it across every page of one process); each test needs a fresh one, isolated from the plugin
// another test's primary already wrapped `link_open` with.
beforeEach(() => {
  disposeMdItInstance()
})

async function rendererFor(primary: 'en' | 'zh-TW') {
  const md = await createMarkdownRenderer(process.cwd(), {}, '/')
  md.use(primaryFolderLinks, primary)
  return md
}

// VitePress sets `path` to the page's file (named by its URL-space `relativePath`) and `realPath` to
// the actual source file, both absolute; `source` is the path relative to `platform/`.
const SRC_DIR = '/tmp/site/platform'

async function renderLink(primary: 'en' | 'zh-TW', relativePath: string, source: string, href: string) {
  const md = await rendererFor(primary)
  const env = { path: `${SRC_DIR}/${relativePath}`, relativePath, realPath: `${SRC_DIR}/${source}`, cleanUrls: true }
  return md.renderAsync(`[x](${href})`, env)
}

function errorOf(promise: Promise<unknown>): Promise<SiteLayoutError> {
  return promise.then(
    () => {
      throw new Error('expected a rejection')
    },
    (err) => err as SiteLayoutError,
  )
}

describe('primaryFolderLinks (0010-S6)', () => {
  // B72, group 1: a link whose resolved URL names the primary locale's folder is PL-E11.
  describe('B72: a link naming the primary folder is PL-E11', () => {
    it('../../en/reference/x.md from zh-TW/guide/notes.md (P=en)', async () => {
      const error = await errorOf(renderLink('en', 'zh-TW/guide/notes.md', 'zh-TW/guide/notes.md', '../../en/reference/x.md'))
      expect(error.code).toBe('PL-E11')
      expect(error.message).toContain(JSON.stringify('zh-TW/guide/notes.md'))
      expect(error.message).toContain(JSON.stringify('../../en/reference/x.md'))
      expect(error.message).toContain("primary locale's folder (en/)")
      expect(error.message).toBe(
        'PL-E11: "zh-TW/guide/notes.md" links to "../../en/reference/x.md", which names the primary locale\'s folder (en/); the primary locale\'s pages are served without it.',
      )
      expect(error.message).not.toContain(SRC_DIR)
    })

    it('../../zh-TW/guide/x.md from en/guide/a.md (P=zh-TW)', async () => {
      const error = await errorOf(renderLink('zh-TW', 'en/guide/a.md', 'en/guide/a.md', '../../zh-TW/guide/x.md'))
      expect(error.code).toBe('PL-E11')
      expect(error.message).toContain("primary locale's folder (zh-TW/)")
      expect(error.message).toBe(
        'PL-E11: "en/guide/a.md" links to "../../zh-TW/guide/x.md", which names the primary locale\'s folder (zh-TW/); the primary locale\'s pages are served without it.',
      )
      expect(error.message).not.toContain(SRC_DIR)
    })

    it('/en/guide/ (P=en), from a primary-folder page where relativePath differs from the source', async () => {
      // The page itself is in the primary folder, so its relativePath is already rewritten
      // (BC3); realPath is the actual source path, and that is what PL-E11 names (open item B-f).
      const error = await errorOf(renderLink('en', 'foo.md', 'en/foo.md', '/en/guide/'))
      expect(error.code).toBe('PL-E11')
      expect(error.message).toContain(JSON.stringify('en/foo.md'))
      expect(error.message).toBe(
        'PL-E11: "en/foo.md" links to "/en/guide/", which names the primary locale\'s folder (en/); the primary locale\'s pages are served without it.',
      )
      expect(error.message).not.toContain(SRC_DIR)
    })

    it('/zh-TW (P=zh-TW)', async () => {
      const error = await errorOf(renderLink('zh-TW', 'foo.md', 'zh-TW/foo.md', '/zh-TW'))
      expect(error.code).toBe('PL-E11')
      expect(error.message).toBe(
        'PL-E11: "zh-TW/foo.md" links to "/zh-TW", which names the primary locale\'s folder (zh-TW/); the primary locale\'s pages are served without it.',
      )
      expect(error.message).not.toContain(SRC_DIR)
    })
  })

  // B72, group 2: a link that only looks like it starts with the primary's code is not PL-E11.
  describe('B72: a code-like segment is not PL-E11', () => {
    it('/english/x (P=en) passes', async () => {
      const html = await renderLink('en', 'foo.md', 'en/foo.md', '/english/x')
      expect(html).toContain('/english/x')
    })

    it('../../enroll/x.md (P=en) passes', async () => {
      const html = await renderLink('en', 'zh-TW/guide/notes.md', 'zh-TW/guide/notes.md', '../../enroll/x.md')
      expect(html).toBeTypeOf('string')
    })

    it('/zh-TWx/y (P=zh-TW) passes', async () => {
      const html = await renderLink('zh-TW', 'foo.md', 'zh-TW/foo.md', '/zh-TWx/y')
      expect(html).toBeTypeOf('string')
    })
  })

  // B73: a cross-folder link into a non-primary folder passes, and renders an href that resolves
  // (as the browser would, from the current page's URL) to /zh-TW/guide/x.
  describe('B73: a cross-folder link into a non-primary folder passes', () => {
    it('../zh-TW/guide/x.md from en/guide/a.md (P=en): resolves to /zh-TW/guide/x', async () => {
      const html = await renderLink('en', 'guide/a.md', 'en/guide/a.md', '../zh-TW/guide/x.md')
      const href = /href="([^"]+)"/.exec(html)?.[1]
      expect(href).toBeDefined()
      expect(new URL(href!, 'http://a.com/guide/a').pathname).toBe('/zh-TW/guide/x')
    })
  })

  // B75: a site-absolute link that does not name the primary passes.
  describe('B75: a site-absolute link that does not name the primary passes', () => {
    it.each(['en', 'zh-TW'] as const)('/guide/python gives no error (primary %s)', async (primary) => {
      const html = await renderLink(primary, 'foo.md', `${primary}/foo.md`, '/guide/python')
      expect(html).toContain('/guide/python')
    })
  })

  // B95: no control character reaches PL-E11's first line, from the page or from the link.
  describe('B95: control characters are escaped in PL-E11', () => {
    it.each([
      ['page', 'zh-TW/a\u001b.md', '/en/x'],
      ['page', 'zh-TW/a\u009b.md', '/en/x'],
      ['link', 'zh-TW/a.md', '/en/\u009b'],
    ])('a control character in the %s (%j, %j)', async (_where, source, href) => {
      const error = await errorOf(renderLink('en', source, source, href))
      expect(error.code).toBe('PL-E11')
      for (const ch of error.message) {
        const cp = ch.codePointAt(0)!
        expect(cp).toBeGreaterThanOrEqual(0x20)
        expect(cp >= 0x7f && cp <= 0x9f).toBe(false)
      }
    })
  })
})
