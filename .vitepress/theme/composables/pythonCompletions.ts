import type { Completion, CompletionContext, CompletionResult, CompletionSource } from '@codemirror/autocomplete'

/** One module and the symbols the editor offers under it. */
export interface ModuleEntry {
  name: string
  functions: string[]
  variables: string[]
}

/**
 * The modules and symbols the Code panel offers as completions.
 *
 * Exported, not private, because `tests/site-smoke/code-panel-platform.spec.ts` resolves
 * every symbol below inside the panel's real Pyodide. A copy of this list inside that test
 * would let the two drift apart, which is the exact failure the guard exists to prevent.
 *
 * `requests` is here because the Code panel installs the real library through micropip and
 * routes its transport through the dispatch bridge — it is the module this platform's
 * learners reach for first. `os` is here because the Code panel runs on its own Pyodide
 * instance with a working virtual filesystem; the reason other projects drop it does not
 * hold here.
 *
 * The list is hand-written, so it can name a symbol the runtime later stops providing.
 * That direction is what the guard catches. The other direction — a symbol the runtime has
 * and this list omits — is not covered by anything, and costs one missing dropdown entry.
 */
export const STDLIB_MODULES: ModuleEntry[] = [
  {
    name: 'requests',
    functions: ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'request'],
    variables: ['Session', 'Response', 'codes', 'exceptions'],
  },
  {
    name: 'os',
    functions: ['listdir', 'getcwd', 'chdir', 'mkdir', 'makedirs', 'remove', 'rmdir', 'rename', 'walk', 'stat'],
    variables: ['environ', 'path', 'sep', 'name'],
  },
  {
    name: 'json',
    functions: ['loads', 'dumps', 'load', 'dump'],
    variables: ['JSONDecodeError'],
  },
  {
    name: 'base64',
    functions: ['b64encode', 'b64decode', 'urlsafe_b64encode', 'urlsafe_b64decode', 'b32encode', 'b32decode', 'b16encode', 'b16decode'],
    variables: [],
  },
  {
    name: 'urllib',
    functions: [],
    variables: ['parse', 'request', 'error'],
  },
  {
    name: 're',
    functions: ['match', 'search', 'findall', 'finditer', 'sub', 'subn', 'split', 'compile', 'fullmatch', 'escape', 'purge'],
    variables: ['IGNORECASE', 'MULTILINE', 'DOTALL', 'VERBOSE', 'ASCII', 'UNICODE'],
  },
  {
    name: 'hashlib',
    // `pbkdf2_hmac` is deliberately absent: the real-runtime guard measured it as
    // missing from Pyodide's `hashlib`. It was inherited from the list this one was
    // ported from, where nothing checked it against a runtime.
    functions: ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512', 'new'],
    variables: ['algorithms_available', 'algorithms_guaranteed'],
  },
  {
    name: 'hmac',
    functions: ['new', 'compare_digest', 'digest'],
    variables: [],
  },
  {
    name: 'binascii',
    functions: ['hexlify', 'unhexlify', 'b2a_hex', 'a2b_hex', 'b2a_base64', 'a2b_base64', 'crc32'],
    variables: [],
  },
  {
    name: 'itertools',
    functions: ['chain', 'product', 'combinations', 'combinations_with_replacement', 'permutations', 'cycle', 'repeat', 'islice', 'starmap', 'takewhile', 'dropwhile', 'groupby', 'accumulate'],
    variables: [],
  },
  {
    name: 'string',
    functions: [],
    variables: ['ascii_lowercase', 'ascii_uppercase', 'ascii_letters', 'digits', 'hexdigits', 'octdigits', 'printable', 'punctuation', 'whitespace'],
  },
  {
    name: 'time',
    functions: ['time', 'sleep', 'monotonic', 'strftime', 'gmtime', 'localtime'],
    variables: [],
  },
  {
    name: 'math',
    functions: ['floor', 'ceil', 'gcd', 'pow', 'sqrt', 'log', 'fabs', 'factorial', 'isnan', 'isinf'],
    variables: ['pi', 'e', 'tau', 'inf', 'nan'],
  },
  {
    name: 'collections',
    functions: ['namedtuple'],
    variables: ['Counter', 'defaultdict', 'OrderedDict', 'deque', 'ChainMap'],
  },
  {
    name: 'functools',
    functions: ['reduce', 'partial', 'wraps', 'lru_cache', 'cache', 'total_ordering', 'cmp_to_key'],
    variables: [],
  },
]

function buildCompletions(): Completion[] {
  const completions: Completion[] = []

  for (const mod of STDLIB_MODULES) {
    completions.push({ label: mod.name, type: 'namespace', detail: 'module' })

    // Functions apply with a trailing '(' so the bracket auto-close (when enabled)
    // supplies the closing one and the caret lands between them.
    for (const fn of mod.functions) {
      completions.push({ label: fn, type: 'function', detail: mod.name, apply: fn + '(' })
    }

    for (const variable of mod.variables) {
      completions.push({ label: variable, type: 'variable', detail: mod.name })
    }
  }

  return completions
}

const COMPLETIONS = buildCompletions()

/**
 * A CodeMirror `CompletionSource` offering the symbols in `STDLIB_MODULES`.
 *
 * Registered by the panel as `pythonLanguage.data.of({ autocomplete: pythonStdlibCompletions() })`.
 */
export function pythonStdlibCompletions(): CompletionSource {
  return function (context: CompletionContext): CompletionResult | null {
    const word = context.matchBefore(/\w*/)
    if (!word) return null

    return {
      from: word.from,
      options: COMPLETIONS,
      validFor: /^\w*$/,
    }
  }
}
