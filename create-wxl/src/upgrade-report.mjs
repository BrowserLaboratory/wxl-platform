// Step 10 (traceability.md "Step order" row 10, "Report"): prints R1-R5, one per line, each
// starting with its own id. T-0027 increment 21 (U26) pins R4's exact wording (traceability.md
// "Report" R4: a fixed body of next-steps advice, plus two conditional bullets -- `pnpm install`
// only when the run wrote `package.json` or `pnpm-lock.yaml`, and the deploy-tag push only for a
// range that has `.github/workflows/deploy.yml`); R1/R2/R3/R5 were already written to their real,
// final shape at increment 1.

import { jsonValue } from './text.mjs'

/** `ops` carrying a `report` code (M10, or an M12 conflict/UP-A11 outcome) are written, but not
 * counted here (traceability.md "Report" R2's own "M10 is not counted as updated"). */
function countsFromOps(ops) {
  const counts = { updated: 0, added: 0, deleted: 0 }
  for (const op of ops) {
    if (op.report !== undefined) continue
    if (op.action === 'delete') counts.deleted++
    else if (op.action === 'write') counts[op.existedBefore ? 'updated' : 'added']++
  }
  return counts
}

/** UP-A12 sorts last among attention lines (traceability.md "Report" R3); every other code sorts
 * by path. UP-A12 does not exist before increment 20 (U59), so this is vacuously true until
 * then. */
function sortAttention(attention) {
  const rest = attention.filter((item) => item.code !== 'UP-A12').sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const anchor = attention.filter((item) => item.code === 'UP-A12')
  return [...rest, ...anchor]
}

/** T-0027 increment 21 (U26), traceability.md "Report" R2's own "M10 is not counted as updated":
 * the same test this op's own `report` field already excludes from `countsFromOps`, above -- a
 * written `package.json`/`pnpm-lock.yaml` still needs `pnpm install` advice whether or not it was
 * an M10 lockfile-conflict write or a plain M5/M12 write. */
function wroteDependencyFile(ops) {
  return ops.some((op) => op.action === 'write' && (op.path === 'package.json' || op.path === 'pnpm-lock.yaml'))
}

/** R4 (traceability.md "Report"): a fixed body of next-steps advice, plus two conditional
 * bullets, each its own `R4:` line (mirrors R3's own one-line-per-item convention). */
function buildR4Lines(lang2, { ops, hasDeployWorkflow }) {
  const zh = lang2 === 'zh-TW'
  const lines = [
    zh ? 'R4: 執行 git status 與 git diff' : 'R4: run git status and git diff',
    // Named generically here (never the literal code "UP-A1"), so this fixed bullet never
    // collides with a path-specific assertion elsewhere checking a particular attention code's
    // ABSENCE from the whole run's stdout (e.g. U56, increment 17's own `not.toContain('UP-A1')`).
    zh
      ? 'R4: 處理上面的衝突標記（搜尋 <<<<<<<）與其他注意項目'
      : 'R4: resolve the conflict markers above (search for <<<<<<<) and the other attention items',
  ]
  if (wroteDependencyFile(ops)) lines.push(zh ? 'R4: 執行 pnpm install' : 'R4: run pnpm install')
  lines.push(zh ? 'R4: build 並測試' : 'R4: build and test')
  lines.push('R4: commit')
  if (hasDeployWorkflow) lines.push(zh ? 'R4: 推送新的 v* tag 以觸發部署' : 'R4: push a new v* tag to deploy')
  return lines
}

export function buildReport({ lang2, toolVersion, baseVersion, baseCommit, targetVersion, targetCommit, ops, attention, hasDeployWorkflow }) {
  const counts = countsFromOps(ops)
  const lines = []
  lines.push(
    `R1: create-wxl ${jsonValue(toolVersion)}; base ${jsonValue(baseVersion)} (${jsonValue(baseCommit)}); ` +
      `target ${jsonValue(targetVersion)} (${jsonValue(targetCommit)})`,
  )
  lines.push(`R2: updated ${counts.updated} added ${counts.added} deleted ${counts.deleted}`)
  // UP-A12 (T-0027 increment 20, U59) is not tied to any one path (traceability.md
  // "Fork:init-derived content"), so it prints without one, unlike every other UP-A* line.
  for (const item of sortAttention(attention)) {
    lines.push(item.code === 'UP-A12' ? 'R3: UP-A12' : `R3: ${item.code} ${jsonValue(item.path)}`)
  }
  lines.push(...buildR4Lines(lang2, { ops, hasDeployWorkflow }))
  lines.push('R5: git clean -fd; git checkout -- .')
  return lines.join('\n') + '\n'
}
