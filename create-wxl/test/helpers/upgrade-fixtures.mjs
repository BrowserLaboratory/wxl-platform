// `buildUpgradeFixtures({ branches })` builds the teacher's range repo (`o`) and the base/target
// archive entry lists (`b`, `t`) for exactly the named branch(es) of the merge table, plus the
// fixed scaffold every row needs regardless: a `.gitignore` the teacher's own range has (`o`),
// absent from B and T (P-2's "both absent", unless a branch overrides it), and an untracked,
// ignored file in neither B nor T. There is no "default 13" baked in: a row names only the
// branch(es) its own fixture needs.
//
// `o` is derived by running the SAME pristine transforms (P1-P3: `applyChangelog`,
// `applyOpenQuestions`, `applyPackageJson`; P4/`range.json` is handled by `makeRangeRepo`'s own
// `rangeJson` option, not here) against a scratch copy of the FULL base entry list (every named
// branch's own base-side changes combined), so `o` starts byte-identical to what the production
// code will independently compute for B's own pristine range -- the same construction
// `run-shared.mjs`'s `applyPristine` performs, called directly rather than re-derived by hand.
// Anchor files (and every other untouched path) are therefore equal on all three sides by
// default; a branch that needs `o` to diverge from that baseline opts in with its own
// `oOverride` entry, applied on top, after the pristine derivation.

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { applyChangelog, applyOpenQuestions, applyPackageJson } from '../../src/pristine.mjs'
import { PRISTINE_FIXTURE } from './fixtures.mjs'
import { makeRangeRepo } from './range-repo.mjs'
import { makeTmpRoot } from './tmp.mjs'

/** A sentinel for an `oOverride` entry that removes a path `o`'s pristine-derived baseline would
 * otherwise have (M7's "the range deleted a file upstream changed"), distinct from `undefined`
 * (which the override maps never contain, since `Object.entries` never yields it from a plain
 * override object literal). */
export const DELETE = Symbol('upgrade-fixtures: delete from o')

/** A 240-byte basename: below `NAME_MAX` (255) on its own, but
 * only by 15 bytes -- the OLD temp-file scheme (destination basename plus a 41-byte prefix) would
 * have pushed a write to this path past that limit. */
export const LONG_BASENAME = `${'a'.repeat(236)}.txt`

/** One entry per branch of P-2, M4-M12 (traceability.md "Pre-checks", "Merge table") this ticket
 * names; each gives `base`/`target` (path -> content, layered onto `PRISTINE_FIXTURE`),
 * `targetDirs`/`baseDirs` (directory entries a brand-new nested path needs in the target or base
 * archive -- M5-added and every other branch whose path lives under a directory that is not in
 * `PRISTINE_FIXTURE` already) and `oOverride` (path -> content, or `DELETE`, applied on top of
 * `o`'s pristine-derived baseline). A path named by exactly one branch never collides with
 * another's. */
const BRANCH_SPECS = {
  'P2-both-absent': {},
  'P2-both-equal': {
    base: { 'p2-shared.txt': 'shared upstream text\n' },
    target: { 'p2-shared.txt': 'shared upstream text\n' },
    oOverride: { 'p2-shared.txt': "teacher's own edit of shared text\n" },
  },
  'M4-both-absent': {
    base: { 'm4-was-deleted.txt': 'base only content\n' },
    oOverride: { 'm4-was-deleted.txt': DELETE },
  },
  'M4-both-equal': {
    base: { 'm4-equal-content.txt': 'base variant\n' },
    target: { 'm4-equal-content.txt': 'identical content\n' },
    oOverride: { 'm4-equal-content.txt': 'identical content\n' },
  },
  'M5-updated': {
    // README.md already exists in PRISTINE_FIXTURE; o derives from base automatically (o ≡ b, as
    // M5-updated requires) -- only the target side changes it (shared anchor file, U26/U59).
    target: { 'README.md': '# wxl\n\nA pristine range fixture, updated by upstream.\n' },
  },
  'M5-added': {
    target: { 'assets/new-file.txt': 'new upstream file\n' },
    targetDirs: ['assets/'],
  },
  M6: {
    base: { 'm6-upstream-removed.txt': 'will be deleted\n' },
    // o derives from base automatically (o ≡ b); target never has it.
  },
  M7: {
    base: { 'm7-teacher-deleted.txt': 'kept upstream\n' },
    target: { 'm7-teacher-deleted.txt': 'kept upstream, updated\n' },
    oOverride: { 'm7-teacher-deleted.txt': DELETE },
  },
  M8: {
    base: { 'm8-teacher-edited.txt': 'original\n' },
    oOverride: { 'm8-teacher-edited.txt': "teacher's own change\n" },
  },
  M9: {
    target: { 'm9-new-both-sides.txt': 'upstream added this independently\n' },
    oOverride: { 'm9-new-both-sides.txt': 'teacher added this\n' },
  },
  M10: {
    base: { 'pnpm-lock.yaml': 'lockfile v1 base\n' },
    target: { 'pnpm-lock.yaml': 'lockfile v1 target\n' },
    oOverride: { 'pnpm-lock.yaml': 'lockfile v1 teacher\n' },
  },
  M11: {
    base: { 'm11-binary.bin': Buffer.from([0, 1, 2, 3, 4, 0, 5]) },
    target: { 'm11-binary.bin': Buffer.from([0, 1, 2, 3, 4, 0, 9]) },
    oOverride: { 'm11-binary.bin': Buffer.from([0, 1, 2, 3, 4, 0, 7]) },
  },
  'M12-clean': {
    base: { 'm12-clean.txt': 'line1\nline2\nline3\nline4\nline5\n' },
    target: { 'm12-clean.txt': 'line1\nline2\nt-line3\nline4\nline5\n' },
    oOverride: { 'm12-clean.txt': 'o-line1\nline2\nline3\nline4\nline5\n' },
  },
  'M12-conflict': {
    base: { 'm12-conflict.txt': 'line1\nline2\nline3\n' },
    target: { 'm12-conflict.txt': 'line1\ntarget-line2\nline3\n' },
    oOverride: { 'm12-conflict.txt': 'line1\noverride-line2\nline3\n' },
  },
  // T-0027 increment 5 (U21): a teacher's own file, absent from both base and target -- P-2
  // (`b ≡ t`, both absent) already leaves it untouched, unreported.
  'teacher-owned': {
    oOverride: { 'teacher-owned.txt': "the teacher's own file, absent from both base and target\n" },
  },
  // T-0027 increment 6 (U22): the fixed scaffold's own `.gitignore` already matches `*.local`
  // (the fixed scaffold's own untracked `scratch.local` file) -- these two reuse that same
  // pattern. `o`'s pristine-derived
  // baseline already equals `base`'s own raw content for a path pristine processing never touches
  // (P5-existing's own `o ≡ b`), so no `oOverride` is needed here.
  'P5-existing': {
    base: { 'existing.local': 'ignored existing content\n' },
    target: { 'existing.local': 'ignored existing content, changed upstream\n' },
  },
  'P5-new': {
    target: { 'added.local': 'ignored new content from upstream\n' },
  },
  // T-0027 increment 15 (U54): a file/directory swap at the same path -- each side that carries
  // the nested path needs its own real directory entry for the real archive (M5-added's own
  // `targetDirs`, extended to the base side too via `baseDirs`).
  'U54-swap-file-to-dir': {
    base: { a: 'kept upstream content before the swap\n' },
    target: { 'a/x': 'upstream added this nested file\n' },
    targetDirs: ['a/'],
  },
  'U54-swap-dir-to-file': {
    base: { 'a/x': 'original nested content\n' },
    baseDirs: ['a/'],
    target: { a: 'upstream replaced the directory with a single file\n' },
  },
  // T-0027 increment 16 (U55, case 2): T adds `a/x`; `o` has a file at `a` the teacher changed
  // (M8 keeps it, `b` present, `t` absent at `a`) -- the parent check then drops the `a/x` write.
  'U55-parent-check': {
    base: { a: 'original a content\n' },
    target: { 'a/x': 'upstream added this under a\n' },
    targetDirs: ['a/'],
    oOverride: { a: "the teacher's own edit of a\n" },
  },
  // T-0027 verification follow-up (item 3, approved sub-case, 2026-11-09): one level deeper than
  // `U55-parent-check` -- T adds `a/b/x`, while `a` itself (not `a/b`) is the kept file the
  // teacher changed. The parent check (traceability.md:153) must walk every parent inside the
  // range, not only the write's own immediate one (`a/b`), to drop this write too.
  'U55-parent-check-deep': {
    base: { a: 'original a content\n' },
    target: { 'a/b/x': 'upstream added this two levels under a\n' },
    targetDirs: ['a/', 'a/b/'],
    oOverride: { a: "the teacher's own edit of a\n" },
  },
  // T-0027 increment 17 (U56): `o` differs from `b` only by CRLF line endings; `t` is genuinely
  // different -- this is still `o ≡ b` (M5), once the `≡` helper normalises CRLF to LF.
  'U56-crlf-m5': {
    base: { 'crlf-m5.txt': 'line one\nline two\n' },
    target: { 'crlf-m5.txt': 'line one\nchanged by upstream\n' },
    oOverride: { 'crlf-m5.txt': 'line one\r\nline two\r\n' },
  },
  // T-0027 increment 17 (U56's own approved extra sub-case): a clean M12 merge whose `o` has CRLF
  // line endings -- `o`'s own edit (line 1) and `t`'s own edit (line 3) do not overlap, so this
  // merges cleanly once the merge-inputs files are written LF-normalised too.
  'U56-crlf-m12': {
    base: { 'crlf-m12.txt': 'alpha\nbeta\ngamma\n' },
    target: { 'crlf-m12.txt': 'alpha\nbeta\ngamma-updated\n' },
    oOverride: { 'crlf-m12.txt': 'alpha-edited\r\nbeta\r\ngamma\r\n' },
  },
  // T-0027 increment 19 (U58): `package.json` merges cleanly (disjoint single-line edits on `o`
  // and `t`, both sides of a `buffer`-line "spacer" that keeps the two hunks from being read as
  // one overlapping change) but the teacher's own disjoint edit (a doubled comma) makes the
  // CLEAN merge's own output invalid JSON. `base`/`target` must stay independently valid JSON
  // (P3's own pristine step parses each one); `o` bypasses pristine entirely (`oOverride`), so it
  // alone carries the broken syntax -- verified against the real `git merge-file` directly before
  // writing this fixture.
  'U58-invalid-json': {
    base: {
      'package.json': JSON.stringify({ name: 'wxl', version: '3.0.0', mid: 'x', buffer: 'y', note: 'AAAA' }, null, 2) + '\n',
    },
    target: {
      'package.json': JSON.stringify({ name: 'wxl', version: '3.0.0', mid: 'x', buffer: 'y', note: 'BBBB' }, null, 2) + '\n',
    },
    oOverride: {
      'package.json': '{\n  "name": "wxl",\n  "version": "0.1.0",\n  "mid": "x",,\n  "buffer": "y",\n  "note": "AAAA"\n}\n',
    },
  },
  // T-0027 increment 20 (U59): a SECOND anchor file (distinct from `M5-updated`'s own
  // `README.md`) that also differs between base and target -- combined with `M5-updated` in the
  // "two anchors diverge" case, to prove the Fork:init-derived-content check still adds exactly
  // ONE `UP-A12` line, not one per anchor. `README.en.md` is not in `PRISTINE_FIXTURE`, so this
  // adds it fresh to both sides (M5: `o` derives from `base`, so `o ≡ b`, `t` differs -- written
  // silently, same as `M5-updated`'s own `README.md`).
  'U59-second-anchor': {
    base: { 'README.en.md': 'base readme, English\n' },
    target: { 'README.en.md': 'base readme, English, updated by upstream\n' },
  },
  // D16 (U72, T-0063): three M6 paths whose sorted order differs between UTF-16 code units
  // (`B.md` < `a/b.md` < `z.md`) and a locale-aware sort; o derives from base (o ≡ b), T lacks them.
  'U72-m6-three': {
    base: { 'z.md': 'z\n', 'a/b.md': 'a/b\n', 'B.md': 'B\n' },
    baseDirs: ['a/'],
  },
  // T-0027 increment 21 (U26): a range that already has `.github/workflows/deploy.yml`, equal on
  // base and target (M4, untouched) -- R4's own "push a new v* tag to deploy" bullet is
  // conditional on this file's presence after the run, not on any attention item or write.
  'U26-deploy-workflow': {
    base: { '.github/workflows/deploy.yml': 'name: Deploy\n' },
    target: { '.github/workflows/deploy.yml': 'name: Deploy\n' },
    baseDirs: ['.github/', '.github/workflows/'],
    targetDirs: ['.github/', '.github/workflows/'],
  },
  // D9 (U63): the range's root `.gitignore` and a nested `sub/.gitignore`
  // both change upstream (the root one drops the rule matching the fixed scaffold's own
  // `scratch.local` and adds an unrelated one); `o` is not overridden, so it derives from
  // `base` on both sides (`o ≡ b`) -- the pre-change behaviour (no P-7) wrongly treats this as a
  // plain M5 write, which is exactly the bug D9 fixes.
  'U63-gitignore': {
    base: { '.gitignore': '*.local\n', 'sub/.gitignore': '*.old\n' },
    target: { '.gitignore': '*.tmp\n', 'sub/.gitignore': '*.new\n' },
    baseDirs: ['sub/'],
    targetDirs: ['sub/'],
  },
  // `≡` must decide "binary" per PATH (any of o/b/t present with a NUL in
  // its first 8000 bytes), not per PAIR being compared. `b` (LF text) and `o` (the same text,
  // CRLF) would be `≡` under a pair-wise decision (neither has a NUL, so CRLF -> LF normalisation
  // applies, and it makes them equal); `t` (binary, has a NUL) makes the WHOLE path binary, so
  // `o` vs `b` must compare raw bytes instead, where the CRLF bytes make them differ.
  'binary-any-side': {
    base: { 'p9-mixed.txt': 'alpha\nbeta\n' },
    target: { 'p9-mixed.txt': Buffer.from([0x61, 0x6c, 0x70, 0x68, 0x61, 0x00, 0x62, 0x65, 0x74, 0x61]) },
    oOverride: { 'p9-mixed.txt': 'alpha\r\nbeta\r\n' },
  },
  // T-0027 increment 25 (D4): a clean M12 merge of a non-UTF-8 (Big5-like) text file, edits on
  // different lines -- each byte sequence below is an invalid UTF-8 lead byte (no NUL), so the
  // ordinary string-decoding `runGit` would turn it into U+FFFD (0xEF 0xBF 0xBD) before
  // `merge-plan.mjs` ever saw it, were it not for D4's own `{ binary: true }` fix.
  'D4-big5': {
    base: { 'big5.txt': Buffer.from([0xa4, 0xa4, 0x0a, 0xb0, 0xcf, 0x0a, 0xa4, 0x55, 0x0a]) },
    target: { 'big5.txt': Buffer.from([0xa4, 0xa4, 0x0a, 0xb0, 0xcf, 0x0a, 0xa4, 0x5e, 0x0a]) },
    oOverride: { 'big5.txt': Buffer.from([0xa4, 0x5d, 0x0a, 0xb0, 0xcf, 0x0a, 0xa4, 0x55, 0x0a]) },
  },
}

function cloneEntries(list) {
  return list.map((entry) => ({ ...entry }))
}

/** Layers `overrides` (path -> content) and `dirs` (new directory paths, e.g. `'assets/'`) onto a
 * copy of `PRISTINE_FIXTURE`: an existing file entry's content is replaced in place; a new path
 * is appended as a `0o644` file entry (after any directory entries `dirs` adds first, so a
 * brand-new nested path's own parent exists for the real archive extraction, traceability.md
 * "Step order" row 7). */
function applyFileOverrides(overrides, dirs = []) {
  const result = cloneEntries(PRISTINE_FIXTURE)
  for (const dir of dirs) {
    if (!result.some((entry) => entry.path === dir)) result.push({ path: dir, type: 'dir', mode: 0o755 })
  }
  for (const [path, content] of Object.entries(overrides)) {
    const idx = result.findIndex((entry) => entry.path === path && entry.type === 'file')
    if (idx !== -1) result[idx] = { ...result[idx], content }
    else result.push({ path, type: 'file', mode: 0o644, content })
  }
  return result
}

/** Writes every `type: 'file'` entry of `entries` under `dir` (manual `/`-joins, not
 * `node:path.join`, matching the archive's own `rest` strings and `git ls-files -z`'s output --
 * Windows-neutral by construction); a missing parent is created with `mkdir(..., {recursive:
 * true})`, so no explicit `dir` entry is needed for this scratch write (unlike the real archive,
 * which `fsops.mjs`'s `extractEntries` writes without `recursive`). */
async function writeEntriesToDir(dir, entries) {
  for (const entry of entries) {
    if (entry.type !== 'file') continue
    const full = join(dir, ...entry.path.split('/'))
    await mkdir(dirname(full), { recursive: true })
    await writeFile(full, entry.content, { mode: entry.mode })
  }
}

/** Reads every regular file under `dir` back into a flat map keyed by its `/`-joined relative
 * path (manual joins, Windows-neutral, matching `writeEntriesToDir`'s own). */
async function readDirAsTree(dir) {
  const tree = {}
  async function walk(current, rel) {
    const names = await readdir(current, { withFileTypes: true })
    for (const name of names) {
      const relPath = rel ? `${rel}/${name.name}` : name.name
      const full = join(current, name.name)
      if (name.isDirectory()) await walk(full, relPath)
      else if (name.isFile()) tree[relPath] = await readFile(full)
    }
  }
  await walk(dir, '')
  return tree
}

/** `o`'s pristine-derived baseline (this file's own header comment): writes `entries` into a
 * scratch directory, runs P1-P3 against it exactly as `run-shared.mjs`'s `applyPristine` would
 * (P4/`range.json` is `makeRangeRepo`'s own concern), reads the result back as a flat tree, then
 * removes the scratch directory. */
async function buildPristineTree(entries) {
  const dir = await makeTmpRoot('create-wxl-upgrade-fixture-pristine-')
  try {
    await writeEntriesToDir(dir, entries)
    const fsAdapter = { readFile, writeFile }
    await applyChangelog(fsAdapter, dir)
    await applyOpenQuestions(fsAdapter, dir)
    await applyPackageJson(fsAdapter, dir)
    return await readDirAsTree(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** Builds `o` (a committed range-repo fixture, `makeRangeRepo`), `b` and `t` (archive entry
 * lists, for `pristineArchive(commit, { entries })`/`makeRefFetchArchive`) for exactly the named
 * `branches` (array of `BRANCH_SPECS` keys) plus the fixed scaffold: a `.gitignore` only the
 * teacher's own range has (absent from B and T, P-2, unless a branch overrides it), and an
 * untracked, ignored file in neither B nor T, written AFTER the repo's own commit so it stays
 * untracked. Returns `{ root, env, commit, baseEntries, targetEntries }` (`root`/`env`/`commit`
 * from `makeRangeRepo`). */
export async function buildUpgradeFixtures({ branches = [], mergeConflictStyle, rangeJson } = {}) {
  const specs = branches.map((name) => {
    const spec = BRANCH_SPECS[name]
    if (spec === undefined) throw new Error(`buildUpgradeFixtures: unknown branch ${JSON.stringify(name)}`)
    return spec
  })

  const baseOverrides = Object.assign({}, ...specs.map((spec) => spec.base ?? {}))
  const targetOverrides = Object.assign({}, ...specs.map((spec) => spec.target ?? {}))
  // T-0027 increment 15: the base side's own directory entries, for a branch whose nested path
  // lives in the BASE archive (mirrors `targetDirs`, below, which M5-added already needed).
  const baseDirs = specs.flatMap((spec) => spec.baseDirs ?? [])
  const targetDirs = specs.flatMap((spec) => spec.targetDirs ?? [])
  const oOverrides = Object.assign({}, ...specs.map((spec) => spec.oOverride ?? {}))

  const baseEntries = applyFileOverrides(baseOverrides, baseDirs)
  const targetEntries = applyFileOverrides(targetOverrides, targetDirs)

  const oTree = await buildPristineTree(baseEntries)
  const treeForRepo = { ...oTree }
  for (const [path, value] of Object.entries(oOverrides)) {
    if (value === DELETE) delete treeForRepo[path]
    else treeForRepo[path] = value
  }

  const gitignore = '*.local\n'
  const rangeRepo = await makeRangeRepo({ tree: treeForRepo, gitignore, mergeConflictStyle, rangeJson })

  // An untracked, `.gitignore`-matched file in neither B nor T (U22), written after the repo's
  // own commit so `git status` (step 4) still sees a clean tree.
  await writeFile(join(rangeRepo.root, 'scratch.local'), 'teacher scratch file, ignored\n')

  return { ...rangeRepo, baseEntries, targetEntries }
}
