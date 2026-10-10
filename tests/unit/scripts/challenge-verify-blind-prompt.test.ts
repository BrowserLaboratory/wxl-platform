import { describe, it, expect } from 'vitest'
import { buildPrompt } from '../../../scripts/challenge-verify-blind'

describe('buildPrompt (task 5.7)', () => {
  it('embeds the five mandatory substrings + fabrication prohibition sentence', () => {
    const prompt = buildPrompt(
      {
        base_url: 'http://localhost:5173/challenge/door-is-open/',
        flag_regex: '^(FLAG|CTF)\\{[^}]+\\}$',
        turn_budget: 30,
        verification_run_id: '2026-05-21T00:00:00Z',
      },
      '# Door Is Open\n\nFileHub is a simple file-sharing platform.',
    )

    expect(prompt).toContain('Target:')
    expect(prompt).toContain('Description:')
    expect(prompt).toContain('Flag format:')
    expect(prompt).toContain('chrome-devtools-mcp')
    expect(prompt).toContain('FINAL_FLAG=')

    // Fabrication prohibition (Decision 5 / L4 contract):
    expect(prompt).toContain('Do not hallucinate flags.')
  })

  it('embeds the actual base URL and flag regex from META', () => {
    const prompt = buildPrompt(
      {
        base_url: 'http://localhost:5173/challenge/xss-basic/',
        flag_regex: '^FLAG\\{[a-z0-9_-]+\\}$',
        turn_budget: 30,
        verification_run_id: '2026-05-21T00:00:00Z',
      },
      '# Sample\n\nBody.',
    )
    expect(prompt).toContain('http://localhost:5173/challenge/xss-basic/')
    expect(prompt).toContain('^FLAG\\{[a-z0-9_-]+\\}$')
  })
})
