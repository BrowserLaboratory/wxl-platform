// The challenge page's slug (seam 0010-S42; Y49). Every brief now lives per-folder —
// `challenge/<slug>/index.md` or, under the locale folders, `<L>/challenge/<slug>/index.md`
// — so the slug is always the parent directory's name. The flat `<slug>.md` form this once
// also accepted is gone with the old layout: a relative path with no parent directory to
// take the slug from derives no slug.

export function slugFromRelativePath(relativePath: string): string | undefined {
  const parts = relativePath.replace(/\.md$/, '').split('/')
  return parts.length >= 2 ? parts[parts.length - 2] : undefined
}
