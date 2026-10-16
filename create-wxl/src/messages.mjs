// Message tables, one per language, keyed by message id. Every CW-E/CW-W text begins with its
// code (D3: CW-E/CW-W go to stderr; N-lines go to stdout). Both tables carry the same id set
// (AC-18): argument/target/download checks, strict parse and entry rules 1-5 (CW-E08), pristine
// rule failures (CW-E10), setup questions (S1-S6's prompts, reasons and summary lines, CW-E05,
// CW-E06, CW-E12, CW-E15), git steps (CW-W01-W03), "Next steps" lines (N1-N8), and the failure
// and signal paths (CW-E09, CW-E11, CW-E14, CW-W05).

import { jsonValue, posixCommand, posixQuoteWord, formatDirectoryArg, hasControlChar } from './text.mjs'
import { printedForms } from './git-steps.mjs'
import { MINIMUM_GIT_VERSION } from './git-version.mjs'

/** CW-W01's minimum-version text (S-10), one source with the actual check (`isGitVersionOk`'s
 * own default), not a hardcoded "2.20" repeated in both language tables. */
const MINIMUM_GIT_VERSION_TEXT = MINIMUM_GIT_VERSION.join('.')

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

export const en = {
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
  'CW-E07': ({ url, detail }) => `CW-E07: downloading ${jsonValue(url)} failed: ${cwE07DetailText('en', detail)}.`,
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
  'S6-ORIGIN': ({ origin }) => `  short link origin: ${jsonValue(origin)}`,
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
  'CW-E07': ({ url, detail }) => `CW-E07：下載 ${jsonValue(url)} 失敗：${cwE07DetailText('zh-TW', detail)}。`,
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
  'S6-ORIGIN': ({ origin }) => `  短連結網址：${jsonValue(origin)}`,
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
