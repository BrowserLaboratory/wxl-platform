// Message tables, one per language, keyed by message id. Every CW-E/CW-W text begins with its
// code (D3: CW-E/CW-W go to stderr; N-lines go to stdout). Both tables carry the same id set
// (AC-18): argument/target/download checks, strict parse and entry rules 1-5 (CW-E08), pristine
// rule failures (CW-E10), setup questions (S1-S6's prompts, reasons and summary lines, CW-E05,
// CW-E06, CW-E12, CW-E15), git steps (CW-W01-W03), "Next steps" lines (N1-N8), and the failure
// and signal paths (CW-E09, CW-E11, CW-E14, CW-W05). Every UP-* text (0006's upgrade path:
// UP-E01-E13, UP-I01, UP-A1-A15) likewise begins with its code, in both tables
// (`upgrade-messages.test.mjs` checks the whole UP-* set).

import { jsonValue, posixCommand, posixQuoteWord, formatDirectoryArg, hasControlChar, jsonStringifyEscaped } from './text.mjs'
import { printedForms } from './git-steps.mjs'
import { MINIMUM_GIT_VERSION } from './git-version.mjs'
import { MINIMUM_BASE_VERSION_TEXT } from './base-version.mjs'
import { VERSION_RE } from './patterns.mjs'
import { restoreCommandLine } from './upgrade-report.mjs'

/** CW-W01's and UP-E02's minimum-version text (S-10), one source with the actual check (`isGitVersionOk`'s
 * own default), not a hardcoded version repeated in both language tables. */
const MINIMUM_GIT_VERSION_TEXT = MINIMUM_GIT_VERSION.join('.')

/** Candidate 22 (stage 7): the fallback UP-E10 prints when `jsonStringifyEscaped` cannot (a
 * `JSON.stringify` throw, or a `function`/`undefined` value it reflects back as `undefined`) --
 * only `array`/`object`/`null`/`number`/`boolean` are reachable from the one call site this
 * exists for (a non-string `version` read from parsed JSON). */
function typeNameOf(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

const CONDITION_TEXT = {
  en: {
    file: 'it is not a directory',
    symlink: 'it is a symbolic link',
    'non-empty': 'it is not an empty directory',
    'parent-missing': 'its parent does not exist',
    'parent-not-directory': 'its parent is not a directory',
    'parent-not-writable': 'its parent is not writable',
    'cross-device': 'it is on a different device than its parent',
    'lstat-error': 'it could not be checked',
  },
  'zh-TW': {
    file: '它不是資料夾',
    symlink: '它是符號連結',
    'non-empty': '它不是空資料夾',
    'parent-missing': '上層資料夾不存在',
    'parent-not-directory': '上層資料夾不是資料夾',
    'parent-not-writable': '上層資料夾無法寫入',
    'cross-device': '它與上層資料夾不在同一個磁碟裝置',
    'lstat-error': '無法檢查它',
  },
}

/** CW-E02's reason text, keyed by `reason` (S-12): what is wrong, not just "invalid argument". */
const CW_E02_REASON_TEXT = {
  en: {
    unknown: (value) => `${jsonValue(value)} is not a valid argument.`,
    'missing-value': (value) => `${jsonValue(value)} is missing its value.`,
    repeated: (value) => `${jsonValue(value)} was given more than once.`,
    'conflicts-with-no-setup': (value) => `${jsonValue(value)} cannot be combined with --no-setup.`,
    // C60's own matrix pins both: the variable's name AND its value (escaped), not the name
    // alone (badValue is the raw override string; undefined when a caller has none to show).
    'bad-env': (value, badValue) =>
      `the environment variable ${jsonValue(value)} must be 40 lowercase hexadecimal characters` +
      (badValue !== undefined ? `, not ${jsonValue(badValue)}` : '') +
      '.',
  },
  'zh-TW': {
    unknown: (value) => `${jsonValue(value)} 不是合法的參數。`,
    'missing-value': (value) => `${jsonValue(value)} 缺少對應的值。`,
    repeated: (value) => `${jsonValue(value)} 出現超過一次。`,
    'conflicts-with-no-setup': (value) => `${jsonValue(value)} 不能與 --no-setup 一起使用。`,
    'bad-env': (value, badValue) =>
      `環境變數 ${jsonValue(value)} 必須是 40 位小寫十六進位字元` +
      (badValue !== undefined ? `，而不是 ${jsonValue(badValue)}` : '') +
      '。',
  },
}

/** CW-E05's missing-flags text (traceability.md "Error and warning codes"): each missing flag
 * named, `--no-setup` offered as an escape, and npm's `--` reminder (the Command grammar's own
 * note). The command fragment
 * (`npm create wxl <directory> -- <flags>`) is identical text in both languages (AC-18), without
 * backticks (S-06); zh-TW says 參數 for a command-line flag, not 旗標, consistent with CW-E02
 * (S-05: 旗標 is already taken by two other things in this repo's GLOSSARY). */
function cwE05Text(lang, missing) {
  const list = missing.map((name) => `--${name}`).join(', ')
  const command = 'npm create wxl <directory> -- <flags>'
  if (lang === 'zh-TW') {
    return (
      `CW-E05：缺少必填的參數：${list}。可以加 --no-setup 跳過設定，` +
      `或是（透過 npm 時）執行 ${command}，記得在參數前面加上 --。`
    )
  }
  return (
    `CW-E05: missing required flag(s): ${list}. Use --no-setup to skip setup, ` +
    `or (through npm) run ${command}, remembering the -- before the flags.`
  )
}

/** traceability.md "Error and warning codes": "When a value to be placed in such a command
 * contains a C0, DEL or C1 character, the command is not printed; the message says the value
 * contains control characters and shows it escaped." One wording, shared by every withheld line
 * (N1's `cd`, CW-E12/CW-W05's `cd` and `pnpm fork:init`). */
function controlCharNotice(lang, value) {
  return lang === 'zh-TW'
    ? `（這個值含控制字元，不印出指令：${jsonValue(value)}）`
    : `(this value contains control characters, so the command is not printed: ${jsonValue(value)})`
}

/** The `cd <directory>` line all of N1/CW-E12/CW-W05 print, or the withheld notice. One function
 * so N1 (below) and CW-E12's finishing commands agree. */
function cdLineOrNotice(lang, directory) {
  if (!hasControlChar(directory)) return posixCommand(['cd', formatDirectoryArg(directory)])
  return controlCharNotice(lang, directory)
}

/** The `pnpm fork:init <argv>` line, or the withheld notice naming the first offending argv item
 * (decision 1): `argv`'s own items are user-given answers/flag values, the same kind of outside
 * value `directory` is, so the same rule applies to them. */
function forkInitLineOrNotice(lang, argv) {
  const offending = argv.find(hasControlChar)
  if (offending === undefined) return `pnpm fork:init ${argv.map(posixQuoteWord).join(' ')}`
  return controlCharNotice(lang, offending)
}

/** CW-E12's finishing commands (traceability.md "Error and warning codes"): `cd <directory>`
 * (the user's own string, per C60's `cd ./-x`), `pnpm install`, `pnpm fork:init` with the same
 * argv items, then G1, G2 and G4's printed forms (traceability.md "Git steps"), each POSIX-quoted
 * for copying. `directory` is the user-given string (positional or question answer), never the
 * resolved path. `lang` is required (S-21): the caller already knows which table it is building
 * this for, so this never silently falls back to en. */
export function cwE12FinishingCommandsList({ directory, argv, version, lang }) {
  const forms = printedForms(version)
  return [
    cdLineOrNotice(lang, directory),
    posixCommand(['pnpm', 'install']),
    forkInitLineOrNotice(lang, argv),
    forms.init,
    forms.symbolicRef,
    forms.add,
    forms.commit,
  ]
}

function cwE12Text(lang, { message, directory, argv, version }) {
  const header = lang === 'zh-TW' ? `CW-E12：引擎失敗：${jsonValue(message)}。` : `CW-E12: the engine failed: ${jsonValue(message)}.`
  const intro =
    lang === 'zh-TW'
      ? '靶場與 range.json 都留著；用這些指令完成設定：'
      : 'The range and range.json stay; finish setup with these commands:'
  return `${header} ${intro}\n${cwE12FinishingCommandsList({ directory, argv, version, lang }).join('\n')}`
}

/** CW-E11's text (traceability.md "Error and warning codes"): the target, the error, and -- when
 * rollback itself could not move an entry back -- that entry's name and the kept temporary
 * directory's path (Notes: "CW-E11 names each such entry and the temporary directory's path is
 * kept and named"). */
function cwE11Text(lang, { target, detail, stranded = [], tmpDir }) {
  const header =
    lang === 'zh-TW'
      ? `CW-E11：搬移 ${jsonValue(target)} 到位失敗：${jsonValue(detail)}。`
      : `CW-E11: moving ${jsonValue(target)} into place failed: ${jsonValue(detail)}.`
  if (stranded.length === 0) return header
  const names = stranded.map(jsonValue).join(', ')
  if (lang === 'zh-TW') {
    return `${header}${names} 無法搬回暫存資料夾，仍留在目標內；暫存資料夾 ${jsonValue(tmpDir)} 因此保留。`
  }
  // S-25: the subject is plural when more than one entry is stranded.
  const subject = stranded.length === 1 ? 'it is' : 'they are'
  return `${header} ${names} could not be moved back; ${subject} still in the target, and the temporary directory ${jsonValue(tmpDir)} was kept.`
}

/** CW-E07's `detail` is structured ({ kind: 'timeout' } / { kind: 'status', status } / { kind:
 * 'error', message }) and rendered by each table; an outside error message is printed through the
 * JSON-literal escaping (S-10, S-11). */
function cwE07DetailText(lang, detail) {
  if (detail.kind === 'timeout') {
    return lang === 'zh-TW' ? '下載逾時' : 'the download timed out'
  }
  if (detail.kind === 'status') {
    return lang === 'zh-TW' ? `伺服器回應狀態碼 ${detail.status}` : `the server responded with status ${detail.status}`
  }
  return lang === 'zh-TW' ? `下載失敗：${jsonValue(detail.message)}` : `the download failed: ${jsonValue(detail.message)}`
}

/** D18 (traceability.md revision 3.2; T-0061): the remedies for a base read from `range.json`
 * that the upgrade refused, in this order -- `--from <version>` first (checked through upstream's
 * tag), the recorded commit only when the teacher knows the range was made from it, then how to see
 * who changed the setup record. `reason` says why the recorded commit is in doubt: `'not-release'`
 * for UP-E12 (the tag names another commit), `'unchecked'` for UP-E08 and a 404 on the tag
 * download (the commit could not be checked against its tag; the tag may only have been deleted). */
function recordedBaseRemediesText(lang, reason) {
  if (lang === 'zh-TW') {
    const doubt = reason === 'not-release' ? '記錄的 commit 不是發布版' : '記錄的 commit 沒辦法經由它的 tag 驗證'
    return (
      '如果你知道這個靶場是從哪一版上游建立的，請用 --from <version> 重新執行（會經由上游的 tag 驗證）。' +
      `${doubt}：只有確定這個靶場就是從它建立時，才用 --from <commit> 指定它。` +
      'git log -p -- range.json 可以查出是誰改了這份設定紀錄。'
    )
  }
  const doubt = reason === 'not-release' ? 'The recorded commit is not a release' : 'The recorded commit could not be checked against its tag'
  return (
    "If you know the release this range came from, run the upgrade again with --from <version> (checked through upstream's tag). " +
    `${doubt}: name it with --from <commit> only if you know this range was made from it. ` +
    'git log -p -- range.json shows who changed the setup record.'
  )
}

export const en = {
  'UP-E01': ({ path }) =>
    `UP-E01: ${jsonValue(path)} is not the top level of a git work tree; run upgrade in the range's own root.`,
  'UP-I01': ({ version, commit }) =>
    `UP-I01: nothing to do; the range is already at version ${jsonValue(version)} (commit ${jsonValue(commit)}).`,
  'UP-E02': ({ version }) =>
    `UP-E02: git could not be run, or is older than ${MINIMUM_GIT_VERSION_TEXT}` +
    (version !== undefined ? ` (found ${jsonValue(version)})` : '') +
    `; install a newer git from https://git-scm.com/downloads.`,
  'UP-E03': ({ reason }) => `UP-E03: the range is not clean (${jsonValue(reason)}); run git status to see what changed.`,
  'UP-E04': () =>
    `UP-E04: no range.json was found and no --from was given; pass --from <version> or --from <commit>, ` +
    `or run this in a range made with create-wxl, which always has a range.json.`,
  'UP-E05': ({ rangeRepository, sourceRepository }) =>
    `UP-E05: range.json's upstream.repository ${jsonValue(rangeRepository)} does not match the upstream repository ${jsonValue(sourceRepository)}.`,
  'UP-E06': ({ reason }) => `UP-E06: range.json is invalid (${jsonValue(reason)}).`,
  'UP-E07': ({ baseVersion, targetVersion }) =>
    `UP-E07: the range's base version ${jsonValue(baseVersion)} is higher than the target version ${jsonValue(targetVersion)}; downgrading is not supported.`,
  'UP-E10': ({ version }) => {
    if (version === undefined) {
      return `UP-E10: the base version could not be read; a range from before ${MINIMUM_BASE_VERSION_TEXT} cannot be upgraded by this tool.`
    }
    if (typeof version !== 'string') {
      const printed = jsonStringifyEscaped(version) ?? typeNameOf(version)
      return `UP-E10: the base version ${printed} is not valid; a range from before ${MINIMUM_BASE_VERSION_TEXT} cannot be upgraded by this tool.`
    }
    if (!VERSION_RE.test(version)) {
      return `UP-E10: the base version ${jsonValue(version)} is not valid; a range from before ${MINIMUM_BASE_VERSION_TEXT} cannot be upgraded by this tool.`
    }
    return `UP-E10: the base version ${jsonValue(version)} is lower than ${MINIMUM_BASE_VERSION_TEXT}; a range from before ${MINIMUM_BASE_VERSION_TEXT} cannot be upgraded by this tool.`
  },
  // D18 (T-0061): `remedies` is set for a base read from range.json.
  'UP-E08': ({ tag, remedies }) =>
    `UP-E08: the tag ${jsonValue(tag)}'s archive comment is not 40 lowercase hexadecimal characters; the commit the tag names could not be read.` +
    (remedies ? ` ${recordedBaseRemediesText('en', 'unchecked')}` : ''),
  // T-0027 increment 1 (traceability.md "Codes", attention items UP-A1-UP-A12): a fixed
  // description per code, never per-instance (the path itself is printed by R3, next to the
  // code, not inside this text) -- so every one of these takes no fields at all, trivially safe
  // under `language.test.mjs`'s shared `ARGS` object: a function that never destructures anything
  // can never throw on a missing field.
  'UP-A1': () => `UP-A1: a conflict was written, marked with three labels (range, the base version, the target version).`,
  'UP-A2': () => `UP-A2: a binary file changed on both sides; the range's own version was kept.`,
  'UP-A3': () => `UP-A3: upstream deleted a file the range changed; the range's own version was kept.`,
  'UP-A4': () => `UP-A4: upstream added a file where the range already has a different one; the range's own version was kept.`,
  'UP-A5': () => `UP-A5: the range deleted a file upstream changed; it stays deleted.`,
  'UP-A6': () => `UP-A6: the lockfile changed on both sides; upstream's was taken. Run pnpm install.`,
  // T-0027 increment 4 (traceability.md "Codes", P-3): the path is or passes through a symbolic
  // link in the range; untouched.
  'UP-A7': () => `UP-A7: the path is or passes through a symbolic link in the range; it was left untouched.`,
  // T-0027 increment 6 (traceability.md "Codes", P-5): the path is ignored by the range's own
  // rules; untouched.
  'UP-A9': () => `UP-A9: the path is ignored by the range's own rules; it was left untouched.`,
  // T-0027 increment 13 (traceability.md "Codes", P-4): another path differs only by
  // `path.normalize('NFC')` and `toLowerCase()` (`merge-plan.mjs`'s `hasCaseCollision`) --
  // lowercasing, not full Unicode case folding (recorded, not changed), so the text names the
  // Unicode form too, not only letter case; untouched.
  'UP-A8': () =>
    `UP-A8: another path in the range differs from this one only by letter case or Unicode form; it was left untouched.`,
  // T-0027 increment 15 (traceability.md "Codes", P-6 and the parent check): the range has a
  // directory or other non-file where upstream has a file, or a planned write's parent is kept as
  // a non-directory; either way, untouched.
  'UP-A10': () => `UP-A10: the range has a directory or other non-file where upstream has a file (or the reverse); it was left untouched.`,
  // T-0027 increment 19 (traceability.md "Codes", M12): a clean merge of a `.json` file produced
  // output that does not parse as JSON; the range's own version was kept instead.
  'UP-A11': () => `UP-A11: a clean JSON merge did not parse; the range's own version was kept.`,
  // T-0027 increment 20 (traceability.md "Fork:init-derived content", "Codes" UP-A12): any of the
  // nine anchor files differs between base and target; this adds the single UP-A12 line, never
  // naming the files themselves -- the one fixed text below covers both the
  // rerun-with-original-arguments clause and the deploy-workflow clause.
  'UP-A12': () =>
    `UP-A12: upstream changed files pnpm fork:init writes. After resolving every attention item, rerun pnpm fork:init with the range's original arguments; for a range with a deploy workflow, this also refreshes it.`,
  // D9 (traceability.md "Pre-checks" P-7, "Codes" UP-A13): an ignore file (at any level) that
  // upstream changed is never written, so the restore commands and every ignored file stay
  // safe; the teacher merges the ignore rules by hand.
  'UP-A13': () =>
    `UP-A13: upstream changed an ignore file; it was left untouched so ignored files and the restore commands stay safe. Merge the ignore rules by hand.`,
  // D10 (traceability.md "Pre-checks" P-8, "Codes" UP-A14): the path is a submodule (a gitlink in
  // the index) or lies under one; left untouched, since the restore commands cannot undo a change
  // inside a submodule's own working tree.
  'UP-A14': () =>
    `UP-A14: the path is a submodule, or is inside one; it was left untouched, since the restore commands cannot undo a change there.`,
  // P-9 (D12, T-0062).
  'UP-A15': () =>
    `UP-A15: the path's name on disk differs from upstream's (a short name, ignored characters, or letter case, in the path or a parent); it was left untouched.`,
  // T-0027 increment 10 (traceability.md "Codes" UP-E09): a write failed, or a signal arrived,
  // during step 9 (apply); names the path and the file-system error, or (for a signal) the signal
  // name, plus the restore commands as one line in D14's order (`restoreCommandLine`: `git checkout
  // -- . && git clean -fd`; D14 T-0063, D23 T-0066).
  'UP-E09': ({ path, signal, detail }) =>
    `UP-E09: ` +
    (signal !== undefined
      ? `a signal (${jsonValue(signal)}) stopped the upgrade while applying the plan`
      : `applying the plan failed at ${jsonValue(path)}: ${jsonValue(detail)}`) +
    `; the range may be partially changed. Run ${restoreCommandLine()} to restore it to HEAD.`,
  // T-0027 increment 18 (traceability.md "Codes" UP-E11): planning (step 8) failed -- `git
  // merge-file` exited outside 0-127 (or was ended by a signal, `code` `null`), or its output was
  // not read in full (traceability.md's own wording for this code; no code path exercises that
  // last clause -- see the ticket's coverage report). Nothing is written in the range before
  // step 9, so there is nothing to restore (unlike UP-E09).
  // `detail` is the underlying error's own text (a read error of o/b/t, or a `runGit` rejection
  // for `merge-file`) -- absent for `MergeFileError` (U57's own "exited outside 0-127" case),
  // which keeps its fixed wording instead.
  'UP-E11': ({ path, detail }) =>
    `UP-E11: planning the merge failed at ${jsonValue(path)}: ` +
    (detail !== undefined ? jsonValue(detail) : `git merge-file did not finish normally.`),
  // J6, D11, D18 (T-0061): the base read from range.json is not the commit upstream's tag names.
  'UP-E12': ({ version, recordedCommit, tagCommit }) =>
    `UP-E12: range.json records version ${jsonValue(version)} with commit ${jsonValue(recordedCommit)}, ` +
    `but upstream's tag ${jsonValue(`v${version}`)} names commit ${jsonValue(tagCommit)}, so the recorded base is not an upstream release. ` +
    `range.json may have been written with CREATE_WXL_COMMIT or by a package packed at a commit other than its version's tag, the tag may have moved since, or someone may have changed the setup record. ` +
    recordedBaseRemediesText('en', 'not-release'),
  // D15 (OQ-026; T-0061): an untracked range.json that the range's rules ignore.
  'UP-E13': () =>
    `UP-E13: range.json is not tracked and the range's ignore rules ignore it, so the restore commands could not undo the upgrade's change to it. ` +
    `The rule may be in a .gitignore, in .git/info/exclude or in your core.excludesFile. ` +
    `Remove the rule and commit that change, together with range.json when it exists; or, when range.json exists, track it with git add -f -- range.json and commit it. ` +
    `If a tracked file's name differs from range.json only in letter case (such as Range.json), rename it to range.json with git mv and commit.`,
  'CW-E01': ({ running, minimum }) =>
    `CW-E01: the running Node.js ${jsonValue(running)} is older than the minimum ${jsonValue(minimum)}; install a newer Node.js from https://nodejs.org/.`,
  'CW-E02': ({ value, usage, reason = 'unknown', badValue }) =>
    `CW-E02: ${CW_E02_REASON_TEXT.en[reason](value, badValue)}` + (usage ? ' Usage: create-wxl <directory>' : ''),
  'CW-E03': () => `CW-E03: no directory was given. Usage: create-wxl <directory>`,
  'CW-E04': ({ path, conditionId, detail }) =>
    `CW-E04: the target ${jsonValue(path)} cannot be used: ${CONDITION_TEXT.en[conditionId]}` +
    (detail ? ` (${jsonValue(detail)})` : '') +
    '.',
  'CW-E05': ({ missing }) => cwE05Text('en', missing),
  'CW-E06': ({ message }) => `CW-E06: the engine rejected the answers: ${jsonValue(message)}.`,
  // D18 (T-0061): `remedies` is set only for a 404 on the tag download of a base read from range.json.
  'CW-E07': ({ url, detail, remedies }) =>
    `CW-E07: downloading ${jsonValue(url)} failed: ${cwE07DetailText('en', detail)}.` + (remedies ? ` ${recordedBaseRemediesText('en', 'unchecked')}` : ''),
  'CW-E08': ({ rule, path, parseError, isCommentMarker }) =>
    parseError !== undefined
      ? `CW-E08: the archive could not be parsed: ${jsonValue(parseError)}.`
      : `CW-E08: the archive broke entry rule ${rule}` +
        (isCommentMarker ? ' (pax comment)' : path !== undefined ? ` (${jsonValue(path)})` : '') +
        '.',
  'CW-E09': ({ path, detail }) => `CW-E09: a file-system error at ${jsonValue(path)}: ${jsonValue(detail)}.`,
  'CW-E10': ({ file, rule }) => `CW-E10: pristine rule ${rule} failed for ${jsonValue(file)}.`,
  'CW-E11': (args) => cwE11Text('en', args),
  'CW-E12': (args) => cwE12Text('en', args),
  'CW-E13': () => `CW-E13: the create-wxl package is broken. Retry with npm create wxl@latest.`,
  'CW-E14': ({ message, remainingCommands }) =>
    `CW-E14: an unexpected error happened: ${jsonValue(message)}.` +
    (remainingCommands ? ` Run these when ready:\n${remainingCommands.join('\n')}` : ''),
  'CW-E15': () => `CW-E15: input ended while a question was open.`,
  'CW-W01': ({ remainingCommands }) =>
    `CW-W01: the range is not a git repository yet; git was not found, failed, or is older than ${MINIMUM_GIT_VERSION_TEXT} ` +
    `(install a newer one from https://git-scm.com/downloads). Run these when ready:\n${remainingCommands.join('\n')}`,
  'CW-W02': ({ remainingCommands }) =>
    `CW-W02: no explicit committer identity was found; set one, then finish the commit:\n${remainingCommands.join('\n')}`,
  'CW-W03': ({ command, detail, remainingCommands }) =>
    `CW-W03: ${command} failed: ${jsonValue(detail)}. Finish these yourself:\n${remainingCommands.join('\n')}`,
  'CW-W04': ({ commit }) =>
    `CW-W04: using the override commit ${jsonValue(commit)}; this is not a release and is meant for testing.`,
  'CW-W05': ({ remainingCommands }) =>
    remainingCommands.length > 0
      ? `CW-W05: a signal stopped the run; the range stays, run these when ready:\n${remainingCommands.join('\n')}`
      : `CW-W05: a signal stopped the run; the range is already complete, nothing is left to run.`,
  'Q-DIRECTORY': () => `Directory name (default: wxl-range):`,
  'Q-DIRECTORY-TILDE': () => `A directory beginning with ~ is not expanded here; type the directory itself.`,
  S1: () => `Author:`,
  'S1-EMPTY': () => `The author name cannot be empty.`,
  S2: () => `GitHub repository (owner/name):`,
  'S2-EMPTY': () => `The repository cannot be empty.`,
  S3: () => `Host: 1) GitHub Pages  2) Cloudflare Pages:`,
  'S3-INVALID': ({ value }) =>
    `${jsonValue(value)} is not a valid host; answer 1, 2, github-pages or cloudflare-pages.`,
  S4: () => `Site address (https://...), empty to derive it when possible:`,
  'S4-REQUIRED': () => `A site address is required for Cloudflare Pages.`,
  S5: () => `Site name (empty keeps the current name):`,
  'S6-AUTHOR': ({ value }) => `  author: ${jsonValue(value)}`,
  'S6-REPO': ({ value }) => `  repository: ${jsonValue(value)}`,
  'S6-HOST': ({ value }) => `  host: ${jsonValue(value)}`,
  'S6-ORIGIN-ANSWER': ({ value }) => `  site address answered: ${jsonValue(value)}`,
  'S6-ORIGIN': ({ origin }) => `  range address, the origin of every copied link: ${jsonValue(origin)}`,
  'S6-SITE-NAME': ({ value }) => `  site name: ${jsonValue(value)}`,
  S6: () => `Apply these settings? [Y/n]`,
  'S6-INVALID': () => `Please answer y, yes, n or no (empty counts as yes).`,
  'ENGINE-REJECTED': ({ message }) =>
    `The engine rejected the answers: ${jsonValue(message)}. Starting over with the current answers.`,
  N1: ({ directory }) => `Next: ${cdLineOrNotice('en', directory)}`,
  N2: ({ remainingCommands }) => `Next: finish the git steps yourself:\n${remainingCommands.join('\n')}`,
  N3: ({ owner, name }) => `Next: create an empty GitHub repository ${jsonValue(`${owner}/${name}`)}, without a README.`,
  N4: ({ owner, name }) =>
    `Next: ${posixCommand(['git', 'remote', 'add', 'origin', `https://github.com/${owner}/${name}.git`])}, then ${posixCommand(['git', 'push', '-u', 'origin', 'main'])}.`,
  N5: () =>
    'Next: on GitHub, set Settings → Pages → Source to GitHub Actions, and allow v* tags in the github-pages environment; then ' +
    `${posixCommand(['git', 'tag', 'v0.1.0'])} and ${posixCommand(['git', 'push', 'origin', 'v0.1.0'])}.`,
  N6: () => 'Next: deploying to Cloudflare Pages — follow the README section "Deploying to Cloudflare Pages".',
  N7: () =>
    `Next: ${posixCommand(['pnpm', 'install'])} and Rust with wasm-pack are needed only to run the site locally (README "Prerequisites").`,
  N8: () =>
    `Next: ${posixCommand(['pnpm', 'install'])}, then ${posixCommand(['pnpm', 'fork:init'])} as the README describes.`,
}

export const zhTW = {
  'UP-E01': ({ path }) => `UP-E01：${jsonValue(path)} 不是 git 工作目錄的頂層；請在靶場自己的根目錄執行 upgrade。`,
  'UP-I01': ({ version, commit }) => `UP-I01：不需要升級；靶場目前已經是版本 ${jsonValue(version)}（commit ${jsonValue(commit)}）。`,
  'UP-E02': ({ version }) =>
    `UP-E02：git 無法執行，或版本低於 ${MINIMUM_GIT_VERSION_TEXT}` +
    (version !== undefined ? `（偵測到 ${jsonValue(version)}）` : '') +
    `；請到 https://git-scm.com/downloads 安裝較新版本。`,
  'UP-E03': ({ reason }) => `UP-E03：靶場不乾淨（${jsonValue(reason)}）；請執行 git status 查看變更內容。`,
  'UP-E04': () =>
    `UP-E04：找不到 range.json，也沒有帶 --from；請帶上 --from <version> 或 --from <commit>，` +
    `或是在用 create-wxl 建出來的靶場（一定會有 range.json）裡執行。`,
  'UP-E05': ({ rangeRepository, sourceRepository }) =>
    `UP-E05：range.json 的 upstream.repository ${jsonValue(rangeRepository)} 與上游的 repository ${jsonValue(sourceRepository)} 不一致。`,
  'UP-E06': ({ reason }) => `UP-E06：range.json 不合法（${jsonValue(reason)}）。`,
  'UP-E07': ({ baseVersion, targetVersion }) =>
    `UP-E07：靶場目前的 base 版本 ${jsonValue(baseVersion)} 比 target 版本 ${jsonValue(targetVersion)} 還新，不支援降版。`,
  'UP-E10': ({ version }) => {
    if (version === undefined) {
      return `UP-E10：無法讀出 base 版本；${MINIMUM_BASE_VERSION_TEXT} 之前的靶場無法用這個工具升級。`
    }
    if (typeof version !== 'string') {
      const printed = jsonStringifyEscaped(version) ?? typeNameOf(version)
      return `UP-E10：base 版本 ${printed} 格式不正確；${MINIMUM_BASE_VERSION_TEXT} 之前的靶場無法用這個工具升級。`
    }
    if (!VERSION_RE.test(version)) {
      return `UP-E10：base 版本 ${jsonValue(version)} 格式不正確；${MINIMUM_BASE_VERSION_TEXT} 之前的靶場無法用這個工具升級。`
    }
    return `UP-E10：base 版本 ${jsonValue(version)} 低於 ${MINIMUM_BASE_VERSION_TEXT}；${MINIMUM_BASE_VERSION_TEXT} 之前的靶場無法用這個工具升級。`
  },
  'UP-E08': ({ tag, remedies }) =>
    `UP-E08：tag ${jsonValue(tag)} 的 pax comment 不是 40 位小寫十六進位字元，讀不到 tag 指向的 commit。` +
    (remedies ? recordedBaseRemediesText('zh-TW', 'unchecked') : ''),
  // These UP-A* texts use an ASCII colon after the code, like `R1:`/`R2:`
  // etc. elsewhere in the zh-TW report, instead of this table's own full-width "：" -- a R3 line
  // is `R3: ` (ASCII) followed by one of these, so the two would otherwise mix colon styles in
  // the same line.
  'UP-A1': () => `UP-A1: 寫入了衝突標記，共三個標籤（range、base 版本、target 版本）。`,
  'UP-A2': () => `UP-A2: 有二進位檔案兩邊都改了；保留靶場自己的版本。`,
  'UP-A3': () => `UP-A3: 上游刪除了靶場改過的檔案；保留靶場自己的版本。`,
  'UP-A4': () => `UP-A4: 上游新增的檔案在靶場裡已經是另一個不同的檔案；保留靶場自己的版本。`,
  'UP-A5': () => `UP-A5: 靶場刪除了上游改過的檔案；維持刪除狀態。`,
  'UP-A6': () => `UP-A6: lockfile 兩邊都改了；採用上游的版本，請執行 pnpm install。`,
  'UP-A7': () => `UP-A7: 這個路徑本身或途經的目錄是靶場裡的符號連結；維持不動。`,
  'UP-A9': () => `UP-A9: 這個路徑被靶場自己的規則忽略；維持不動。`,
  'UP-A8': () => `UP-A8: 靶場裡另有一個路徑只差在大小寫或 Unicode 形式；維持不動。`,
  'UP-A10': () => `UP-A10: 靶場這個路徑是目錄或其他非檔案的東西，但上游是檔案（或反過來）；維持不動。`,
  'UP-A11': () => `UP-A11: JSON 乾淨合併後無法解析；保留靶場自己的版本。`,
  'UP-A12': () =>
    `UP-A12: 上游改了 pnpm fork:init 會寫入的檔案；請在解決所有注意項目後，用靶場原本的參數重新執行 pnpm fork:init；若靶場有部署用的 workflow，這個步驟也會一併更新它。`,
  'UP-A13': () => `UP-A13: 上游改了一個忽略規則檔；維持不動，讓忽略的檔案與還原指令都安全。請自行手動合併忽略規則。`,
  'UP-A14': () => `UP-A14: 這個路徑是子模組本身或在子模組裡面；維持不動，因為還原指令無法復原子模組內部的變更。`,
  'UP-A15': () => `UP-A15: 這個路徑在磁碟上的實際名稱和上游的不同（短檔名、檔案系統會略過的字元或大小寫，在路徑本身或父目錄）；維持不動。`,
  'UP-E09': ({ path, signal, detail }) =>
    `UP-E09：` +
    (signal !== undefined ? `收到訊號（${jsonValue(signal)}）後停止套用合併結果` : `套用合併結果時在 ${jsonValue(path)} 失敗：${jsonValue(detail)}`) +
    `；靶場可能已經被部分改動。請執行 ${restoreCommandLine()} 還原到 HEAD。`,
  'UP-E11': ({ path, detail }) =>
    `UP-E11：規劃合併時在 ${jsonValue(path)} 失敗：` + (detail !== undefined ? jsonValue(detail) : `git merge-file 沒有正常結束。`),
  'UP-E12': ({ version, recordedCommit, tagCommit }) =>
    `UP-E12：range.json 記錄的版本是 ${jsonValue(version)}、commit 是 ${jsonValue(recordedCommit)}，` +
    `但上游的 tag ${jsonValue(`v${version}`)} 指向 commit ${jsonValue(tagCommit)}，所以記錄的 base 不是上游的發布版。` +
    `可能的原因：range.json 是用 CREATE_WXL_COMMIT，或由在不是該版本 tag 的 commit 打包的套件寫入的、這個 tag 之後被移動過，或是有人改了這份設定紀錄。` +
    recordedBaseRemediesText('zh-TW', 'not-release'),
  'UP-E13': () =>
    `UP-E13：range.json 沒有被 git 追蹤，又被靶場的 ignore 規則排除，還原指令沒辦法撤銷升級對它的改動。` +
    `這條規則可能在某個 .gitignore、.git/info/exclude，或你的 core.excludesFile 裡。` +
    `請移除這條規則並 commit，range.json 存在時一起 commit；或者在 range.json 存在時，用 git add -f -- range.json 把它納入追蹤並 commit。` +
    `如果被追蹤的檔名和 range.json 只差在大小寫（例如 Range.json），請用 git mv 改名為 range.json 並 commit。`,
  'CW-E01': ({ running, minimum }) =>
    `CW-E01：目前使用的 Node.js ${jsonValue(running)} 低於最低需求 ${jsonValue(minimum)}，請到 https://nodejs.org/ 下載較新版本。`,
  'CW-E02': ({ value, usage, reason = 'unknown', badValue }) =>
    `CW-E02：${CW_E02_REASON_TEXT['zh-TW'][reason](value, badValue)}` + (usage ? '用法：create-wxl <directory>' : ''),
  'CW-E03': () => `CW-E03：未提供目標資料夾。用法：create-wxl <directory>`,
  'CW-E04': ({ path, conditionId, detail }) =>
    `CW-E04：目標 ${jsonValue(path)} 無法使用：${CONDITION_TEXT['zh-TW'][conditionId]}` +
    (detail ? `（${jsonValue(detail)}）` : '') +
    '。',
  'CW-E05': ({ missing }) => cwE05Text('zh-TW', missing),
  'CW-E06': ({ message }) => `CW-E06：引擎拒絕了這些答案：${jsonValue(message)}。`,
  'CW-E07': ({ url, detail, remedies }) =>
    `CW-E07：下載 ${jsonValue(url)} 失敗：${cwE07DetailText('zh-TW', detail)}。` + (remedies ? recordedBaseRemediesText('zh-TW', 'unchecked') : ''),
  'CW-E08': ({ rule, path, parseError, isCommentMarker }) =>
    parseError !== undefined
      ? `CW-E08：壓縮檔無法解析：${jsonValue(parseError)}。`
      : `CW-E08：壓縮檔違反規則 ${rule}` +
        (isCommentMarker ? '（pax comment）' : path !== undefined ? `（${jsonValue(path)}）` : '') +
        '。',
  'CW-E09': ({ path, detail }) => `CW-E09：${jsonValue(path)} 發生檔案系統錯誤：${jsonValue(detail)}。`,
  'CW-E10': ({ file, rule }) => `CW-E10：原廠靶場處理規則 ${rule} 失敗：${jsonValue(file)}。`,
  'CW-E11': (args) => cwE11Text('zh-TW', args),
  'CW-E12': (args) => cwE12Text('zh-TW', args),
  'CW-E13': () => `CW-E13：套件已損壞，請改用 npm create wxl@latest 重試。`,
  'CW-E14': ({ message, remainingCommands }) =>
    `CW-E14：發生未預期的錯誤：${jsonValue(message)}。` +
    (remainingCommands ? `準備好後請執行：\n${remainingCommands.join('\n')}` : ''),
  'CW-E15': () => `CW-E15：問題還開著的時候輸入就結束了。`,
  'CW-W01': ({ remainingCommands }) =>
    `CW-W01：靶場還不是 git repository；找不到 git、git 失敗，或版本低於 ${MINIMUM_GIT_VERSION_TEXT}（請到 ` +
    `https://git-scm.com/downloads 安裝較新版本）。準備好後請執行：\n${remainingCommands.join('\n')}`,
  'CW-W02': ({ remainingCommands }) => `CW-W02：找不到明確的 committer 身分；請先設定，再完成 commit：\n${remainingCommands.join('\n')}`,
  'CW-W03': ({ command, detail, remainingCommands }) =>
    `CW-W03：${command} 失敗：${jsonValue(detail)}。請自行完成剩下的指令：\n${remainingCommands.join('\n')}`,
  'CW-W04': ({ commit }) => `CW-W04：改用測試用的 commit ${jsonValue(commit)}，這不是正式版本，僅供測試。`,
  'CW-W05': ({ remainingCommands }) =>
    remainingCommands.length > 0
      ? `CW-W05：收到訊號而停止；靶場仍保留，準備好後請執行：\n${remainingCommands.join('\n')}`
      : `CW-W05：收到訊號而停止；靶場已經完成，沒有剩下的指令。`,
  'Q-DIRECTORY': () => `資料夾名稱（預設：wxl-range）：`,
  'Q-DIRECTORY-TILDE': () => `以 ~ 開頭的答案這裡不會展開，請直接輸入資料夾本身。`,
  S1: () => `作者：`,
  'S1-EMPTY': () => `作者名稱不能是空的。`,
  S2: () => `GitHub 上的 repository（owner/name）：`,
  'S2-EMPTY': () => `repository 不能是空的。`,
  S3: () => `部署目標：1) GitHub Pages  2) Cloudflare Pages：`,
  'S3-INVALID': ({ value }) => `${jsonValue(value)} 不是合法的部署目標，請回答 1、2、github-pages 或 cloudflare-pages。`,
  S4: () => `網站網址（https://...），可自動推導時直接按 Enter：`,
  'S4-REQUIRED': () => `Cloudflare Pages 一定要填網站網址。`,
  S5: () => `網站名稱（留空保留目前的名稱）：`,
  'S6-AUTHOR': ({ value }) => `  作者：${jsonValue(value)}`,
  'S6-REPO': ({ value }) => `  GitHub repository：${jsonValue(value)}`,
  'S6-HOST': ({ value }) => `  部署目標：${jsonValue(value)}`,
  'S6-ORIGIN-ANSWER': ({ value }) => `  回答的網站網址：${jsonValue(value)}`,
  'S6-ORIGIN': ({ origin }) => `  靶場網址（複製出來的每一條連結都從它開始）：${jsonValue(origin)}`,
  'S6-SITE-NAME': ({ value }) => `  網站名稱：${jsonValue(value)}`,
  S6: () => `要套用這些設定嗎？[Y/n]`,
  'S6-INVALID': () => `請回答 y、yes、n 或 no（留空視為 yes）。`,
  'ENGINE-REJECTED': ({ message }) => `引擎拒絕了這些答案：${jsonValue(message)}。改用目前的答案重新開始。`,
  N1: ({ directory }) => `下一步：${cdLineOrNotice('zh-TW', directory)}`,
  N2: ({ remainingCommands }) => `下一步：請自行完成剩下的 git 步驟：\n${remainingCommands.join('\n')}`,
  N3: ({ owner, name }) => `下一步：在 GitHub 上建立一個空的 ${jsonValue(`${owner}/${name}`)} repository，不要加 README。`,
  N4: ({ owner, name }) =>
    `下一步：${posixCommand(['git', 'remote', 'add', 'origin', `https://github.com/${owner}/${name}.git`])}，接著 ${posixCommand(['git', 'push', '-u', 'origin', 'main'])}。`,
  N5: () =>
    '下一步：在 GitHub 上把 Settings → Pages → Source 設成 GitHub Actions，並允許 github-pages 環境接受 v* tag；接著執行 ' +
    `${posixCommand(['git', 'tag', 'v0.1.0'])}，再執行 ${posixCommand(['git', 'push', 'origin', 'v0.1.0'])}。`,
  N6: () => '下一步：部署到 Cloudflare Pages——請依照 README「部署到 Cloudflare Pages」/"Deploying to Cloudflare Pages" 一節操作。',
  N7: () =>
    `下一步：只有要在本機執行網站時才需要 ${posixCommand(['pnpm', 'install'])}，以及 Rust 與 wasm-pack（README「環境需求」/"Prerequisites"）。`,
  N8: () => `下一步：${posixCommand(['pnpm', 'install'])}，接著 ${posixCommand(['pnpm', 'fork:init'])}，如 README 所述。`,
}

export const messages = { en, 'zh-TW': zhTW }
