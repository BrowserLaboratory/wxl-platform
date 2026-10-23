/**
 * The upstream decision (0004 T65-T66, with 0005-create-wxl's range.json override): whether the
 * tree currently running is upstream itself. Shared by `tests/unit/scripts/upstream-guard.test.ts`,
 * which tests the decision, and by the assertions that hold only on upstream's own origin, such as
 * spec 0007's S08 in `tests/site-smoke/site-smoke.spec.ts` (traceability.md: "S3's upstream-only
 * assertions and S6 use the same decision").
 *
 * Like upstream-guard.test.ts, this file is not on the keep list, so it never spells the upstream
 * repository slug: it compares against the imported `UPSTREAM_SLUG`.
 */
import { lstatSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { UPSTREAM_SLUG } from '../../scripts/fork-init'

/** T65-T66/AC-G2. `hasRangeJson` is the 0005-create-wxl override of 0004 T66: a root range.json
 *  (create-wxl's setup record) means the tree is a created range, never upstream itself, when the
 *  decision falls back to the manifest and work tree; GITHUB_REPOSITORY, when set, still decides
 *  alone and ignores it. */
export function isUpstreamDecision(
  githubRepository: string | undefined,
  manifest: unknown,
  isWorkTree: boolean,
  hasRangeJson: boolean,
): boolean {
  if (githubRepository !== undefined && githubRepository !== '') {
    return githubRepository === UPSTREAM_SLUG
  }
  const repository = typeof manifest === 'object' && manifest !== null ? (manifest as Record<string, unknown>).repository : undefined
  const url = typeof repository === 'object' && repository !== null ? (repository as Record<string, unknown>).url : undefined
  return url === `git+https://github.com/${UPSTREAM_SLUG}.git` && isWorkTree && !hasRangeJson
}

/** Whether `root` is a git work tree at all (T66's fallback condition). `spawnSync` itself
 *  never throws — a missing `git` executable surfaces as `res.error`, not an exception — so there
 *  is nothing here for a `try`/`catch` to catch. */
export function isGitWorkTree(root: string): boolean {
  const res = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' })
  if (res.error || res.status !== 0) return false
  return res.stdout.trim() === 'true'
}

/** `root`'s package.json, or undefined when it cannot be read or parsed. */
export function readManifest(root: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  } catch {
    return undefined
  }
}

/** Whether `root` itself has a root range.json (0005-create-wxl override of 0004 T66): this
 *  repository is upstream and never carries one, but a range created by create-wxl would. */
export function hasRootRangeJson(root: string): boolean {
  try {
    return lstatSync(resolve(root, 'range.json')).isFile()
  } catch {
    return false
  }
}

/** The decision for the tree at `root`, from this process's environment. */
export function realUpstreamDecision(root: string): boolean {
  return isUpstreamDecision(process.env.GITHUB_REPOSITORY, readManifest(root), isGitWorkTree(root), hasRootRangeJson(root))
}
