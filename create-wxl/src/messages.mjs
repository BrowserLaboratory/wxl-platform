// Message tables, one per language, keyed by message id. Every CW-E/CW-W text begins with its
// code (D3: CW-E/CW-W go to stderr; N-lines go to stdout). Ids implemented here cover the
// `--no-setup` path's happy path and failures T-0020 and T-0021 need: argument/target/download
// checks (C01-C16, C50), strict parse and entry rules 1-5 (CW-E08, C17-C21/C55), and pristine
// rule failures (CW-E10, C24/C27). Later tickets add the remaining CW-E/CW-W/N ids to both
// tables, keeping the id sets equal (AC-18).

import { jsonValue, posixCommand, formatDirectoryArg } from './text.mjs'

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
    'bad-env': (value) => `the environment variable ${jsonValue(value)} must be 40 lowercase hexadecimal characters.`,
  },
  'zh-TW': {
    unknown: (value) => `${jsonValue(value)} 不是合法的參數。`,
    'missing-value': (value) => `${jsonValue(value)} 缺少對應的值。`,
    repeated: (value) => `${jsonValue(value)} 出現超過一次。`,
    'conflicts-with-no-setup': (value) => `${jsonValue(value)} 不能與 --no-setup 一起使用。`,
    'bad-env': (value) => `環境變數 ${jsonValue(value)} 必須是 40 位小寫十六進位字元。`,
  },
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
  'CW-E02': ({ value, usage, reason = 'unknown' }) =>
    `CW-E02: ${CW_E02_REASON_TEXT.en[reason](value)}` + (usage ? ' Usage: create-wxl <directory>' : ''),
  'CW-E03': () => `CW-E03: no directory was given. Usage: create-wxl <directory>`,
  'CW-E04': ({ path, conditionId, detail }) =>
    `CW-E04: the target ${jsonValue(path)} cannot be used: ${CONDITION_TEXT.en[conditionId]}` +
    (detail ? ` (${jsonValue(detail)})` : '') +
    '.',
  'CW-E07': ({ url, detail }) => `CW-E07: downloading ${jsonValue(url)} failed: ${cwE07DetailText('en', detail)}.`,
  'CW-E08': ({ rule, path, parseError, isCommentMarker }) =>
    parseError !== undefined
      ? `CW-E08: the archive could not be parsed: ${jsonValue(parseError)}.`
      : `CW-E08: the archive broke entry rule ${rule}` +
        (isCommentMarker ? ' (pax comment)' : path !== undefined ? ` (${jsonValue(path)})` : '') +
        '.',
  'CW-E10': ({ file, rule }) => `CW-E10: pristine rule ${rule} failed for ${jsonValue(file)}.`,
  'CW-E13': () => `CW-E13: the create-wxl package is broken. Retry with npm create wxl@latest.`,
  'CW-W04': ({ commit }) =>
    `CW-W04: using the override commit ${jsonValue(commit)}; this is not a release and is meant for testing.`,
  N1: ({ directory }) => `Next: ${posixCommand(['cd', formatDirectoryArg(directory)])}`,
  N8: () =>
    `Next: ${posixCommand(['pnpm', 'install'])}, then ${posixCommand(['pnpm', 'fork:init'])} as the README describes.`,
}

export const zhTW = {
  'CW-E01': ({ running, minimum }) =>
    `CW-E01：目前使用的 Node.js ${jsonValue(running)} 低於最低需求 ${jsonValue(minimum)}，請到 https://nodejs.org/ 下載較新版本。`,
  'CW-E02': ({ value, usage, reason = 'unknown' }) =>
    `CW-E02：${CW_E02_REASON_TEXT['zh-TW'][reason](value)}` + (usage ? '用法：create-wxl <directory>' : ''),
  'CW-E03': () => `CW-E03：未提供目標資料夾。用法：create-wxl <directory>`,
  'CW-E04': ({ path, conditionId, detail }) =>
    `CW-E04：目標 ${jsonValue(path)} 無法使用：${CONDITION_TEXT['zh-TW'][conditionId]}` +
    (detail ? `（${jsonValue(detail)}）` : '') +
    '。',
  'CW-E07': ({ url, detail }) => `CW-E07：下載 ${jsonValue(url)} 失敗：${cwE07DetailText('zh-TW', detail)}。`,
  'CW-E08': ({ rule, path, parseError, isCommentMarker }) =>
    parseError !== undefined
      ? `CW-E08：壓縮檔無法解析：${jsonValue(parseError)}。`
      : `CW-E08：壓縮檔違反規則 ${rule}` +
        (isCommentMarker ? '（pax comment）' : path !== undefined ? `（${jsonValue(path)}）` : '') +
        '。',
  'CW-E10': ({ file, rule }) => `CW-E10：原廠靶場處理規則 ${rule} 失敗：${jsonValue(file)}。`,
  'CW-E13': () => `CW-E13：套件已損壞，請改用 npm create wxl@latest 重試。`,
  'CW-W04': ({ commit }) => `CW-W04：改用測試用的 commit ${jsonValue(commit)}，這不是正式版本，僅供測試。`,
  N1: ({ directory }) => `下一步：${posixCommand(['cd', formatDirectoryArg(directory)])}`,
  N8: () => `下一步：${posixCommand(['pnpm', 'install'])}，接著 ${posixCommand(['pnpm', 'fork:init'])}，如 README 所述。`,
}

export const messages = { en, 'zh-TW': zhTW }
