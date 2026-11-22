// The primary-folder link rule (seam 0010-S6; D12, PL-E11). A markdown-it plugin: a link whose
// resolved URL path's first segment names the primary locale's folder is an error, because the
// primary locale's pages are served without that prefix (D9's rewrite already stripped it).
// `env.relativePath` is the page's URL-space path relative to the source directory (already
// rewritten, BC3); `env.path` is the same file as an absolute path, and `env.realPath` is the
// page's actual source file, also absolute. PL-E11's `<page>` is that source file relative to the
// source directory (`platform/`), found by cutting from `realPath` the directory prefix that
// `path` and `relativePath` show.

import type MarkdownIt from 'markdown-it'
import { posix } from 'node:path'
import { SiteLayoutError, jsonStringifyEscaped } from './layout-error.ts'
import type { Locale } from './locales.ts'

function resolvedUrlPath(href: string, pageDir: string): string {
  const clean = href.split(/[?#]/)[0]
  if (clean.startsWith('/')) return clean
  return posix.normalize(posix.join('/', pageDir, clean))
}

function sourcePathOf(env: Record<string, unknown>): string {
  const relativePath = String(env.relativePath ?? '')
  const realPath = typeof env.realPath === 'string' ? env.realPath.replace(/\\/g, '/') : undefined
  const path = typeof env.path === 'string' ? env.path.replace(/\\/g, '/') : undefined
  if (realPath !== undefined && path !== undefined && relativePath !== '' && path.endsWith(`/${relativePath}`)) {
    const prefix = path.slice(0, path.length - relativePath.length)
    if (realPath.startsWith(prefix)) return realPath.slice(prefix.length)
  }
  return realPath ?? relativePath
}

function firstSegment(path: string): string | undefined {
  return path.slice(1).split('/')[0] || undefined
}

export function primaryFolderLinks(md: MarkdownIt, primary: Locale): void {
  const previous =
    md.renderer.rules.link_open ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const hrefIndex = token.attrIndex('href')
    if (hrefIndex >= 0) {
      const href = token.attrs![hrefIndex][1]
      const pageDir = posix.dirname(String(env.relativePath ?? ''))
      const resolved = resolvedUrlPath(href, pageDir)
      if (firstSegment(resolved) === primary) {
        const page = sourcePathOf(env)
        throw new SiteLayoutError(
          'PL-E11',
          `PL-E11: ${jsonStringifyEscaped(page)} links to ${jsonStringifyEscaped(href)}, which names the primary locale's folder (${primary}/); the primary locale's pages are served without it.`,
        )
      }
    }
    return previous(tokens, idx, options, env, self)
  }
}
