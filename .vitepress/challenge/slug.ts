// The challenge page's slug (seam 0010-S42; Y49). `relativePath` is the page's path after the
// primary locale's rewrite: `challenge/<slug>/index.md` for a primary-locale brief (its source is
// `<P>/challenge/<slug>/index.md`) and `<L>/challenge/<slug>/index.md` for any other locale, so
// the slug is always the parent directory's name. A relative path with no parent directory
// derives no slug.

export function slugFromRelativePath(relativePath: string): string | undefined {
  const parts = relativePath.replace(/\.md$/, '').split('/')
  return parts.length >= 2 ? parts[parts.length - 2] : undefined
}
