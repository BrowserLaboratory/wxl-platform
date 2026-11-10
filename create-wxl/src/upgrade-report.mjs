// Step 10 (traceability.md "Step order" row 10, "Report"): prints R1-R5, one per line, each
// starting with its own id, in the run's language (`t2`). R3 renders each attention item through the
// language table's own UP-A* text. R4 (traceability.md "Report" R4) is a fixed body of next-steps
// advice plus two conditional bullets: `pnpm install` only when the run wrote `package.json` or
// `pnpm-lock.yaml`, and the deploy-tag push only for a range with `.github/workflows/deploy.yml`.

import { jsonValue } from './text.mjs'

/** D14 (T-0063): the restore commands, in order -- `checkout` first, so a missing or changed
 * ignore file is back before `clean` runs, and `clean` never deletes a file `HEAD`'s rules ignore.
 * R5 and UP-E09 print them, and U70 runs them, from this one list. */
export const RESTORE_COMMANDS = Object.freeze([
  Object.freeze(['git', 'checkout', '--', '.']),
  Object.freeze(['git', 'clean', '-fd']),
])

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
 * by path. */
function sortAttention(attention) {
  const rest = attention.filter((item) => item.code !== 'UP-A12').sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const anchor = attention.filter((item) => item.code === 'UP-A12')
  return [...rest, ...anchor]
}

/** T-0027 increment 21 (U26), traceability.md "Report" R2's own "M10 is not counted as updated":
 * unlike `countsFromOps`, above, this does not look at `op.report` at all -- a written
 * `package.json`/`pnpm-lock.yaml` still needs `pnpm install` advice whether or not it was an M10
 * lockfile-conflict write or a plain M5/M12 write. */
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

export function buildReport({ lang2, toolVersion, baseVersion, baseCommit, targetVersion, targetCommit, ops, attention, hasDeployWorkflow, t2, baseUnchecked = false }) {
  const zh = lang2 === 'zh-TW'
  const counts = countsFromOps(ops)
  const lines = []
  // D17 (traceability.md "Report" R1; T-0061): a `--from <commit>` base is whatever that commit
  // holds -- R1 says it was not checked against an upstream tag.
  const uncheckedNote = baseUnchecked
    ? zh
      ? '；base 由 --from <commit> 指定，沒有比對上游的 tag'
      : '; the base was given by --from <commit> and not checked against an upstream tag'
    : ''
  lines.push(
    zh
      ? `R1: create-wxl ${jsonValue(toolVersion)}；base 版本 ${jsonValue(baseVersion)}（commit ${jsonValue(baseCommit)}）；` +
          `target 版本 ${jsonValue(targetVersion)}（commit ${jsonValue(targetCommit)}）` +
          uncheckedNote
      // Names the commit the same way the zh-TW text above already does.
      : `R1: create-wxl ${jsonValue(toolVersion)}; base ${jsonValue(baseVersion)} (commit ${jsonValue(baseCommit)}); ` +
          `target ${jsonValue(targetVersion)} (commit ${jsonValue(targetCommit)})` +
          uncheckedNote,
  )
  lines.push(
    zh
      ? `R2: 更新 ${counts.updated} 新增 ${counts.added} 刪除 ${counts.deleted}`
      : `R2: updated ${counts.updated} added ${counts.added} deleted ${counts.deleted}`,
  )
  // T-0027 verification follow-up (item 1/2): each attention line is rendered through `t2`
  // (traceability.md:206 "in the run's language"), the same en/zh-TW UP-A* message table every
  // other code already uses -- UP-A12 (T-0027 increment 20, U59) is not tied to any one path
  // (traceability.md "Fork:init-derived content"), so it prints without one, unlike every other
  // UP-A* line.
  for (const item of sortAttention(attention)) {
    lines.push(item.code === 'UP-A12' ? `R3: ${t2[item.code]()}` : `R3: ${t2[item.code]()} ${jsonValue(item.path)}`)
  }
  lines.push(...buildR4Lines(lang2, { ops, hasDeployWorkflow }))
  // traceability.md "Report" R5; spec.en.md B4: the restore commands undo
  // the WHOLE upgrade, so they are only safe BEFORE any other change -- the fixed bare commands
  // alone, without that warning, let a teacher who edits first lose that edit too.
  const [first, second] = RESTORE_COMMANDS.map((command) => command.join(' '))
  lines.push(
    zh
      ? `R5: 如果要撤銷整個升級，請在做其他變更之前依序執行 ${first} 和 ${second}`
      : `R5: to undo the whole upgrade before making other changes, run ${first} then ${second}`,
  )
  return lines.join('\n') + '\n'
}
