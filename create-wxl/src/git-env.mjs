// "Git steps" (traceability.md): every git command runs with `deps.env` minus every variable
// whose name starts with `GIT_`, plus exactly `GIT_TERMINAL_PROMPT=0` and `GIT_CONFIG_NOSYSTEM=1`.
// The filter compares the name exactly, as the spec says (decision 5): Windows' case-insensitive
// environment names are a recorded known limit, not handled here.

export function buildGitEnv(env) {
  const filtered = {}
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('GIT_')) continue
    filtered[key] = value
  }
  return { ...filtered, GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1' }
}
