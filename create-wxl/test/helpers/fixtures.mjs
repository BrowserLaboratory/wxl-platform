// The pristine-fixture entry list shared by create-wxl's tests (T-0020's Notes). All LF line
// endings; P1/P2/P3 rules are exercised against these exact contents.

export const CHANGELOG_CONTENT = ['# Changelog', '', '## [Unreleased]', '', '## [1.0.0] - 2024-01-01', '- Initial release', ''].join(
  '\n',
)

export const CHANGELOG_PRISTINE = ['# Changelog', '', '## [Unreleased]', ''].join('\n')

export const OPEN_QUESTIONS_CONTENT = [
  '# Open Questions',
  '',
  'Track open questions here.',
  '',
  '---',
  '',
  '## OQ-001 — Example question?',
  '',
  'Some body text.',
  '',
].join('\n')

export const OPEN_QUESTIONS_PRISTINE = ['# Open Questions', '', 'Track open questions here.', ''].join('\n')

export const PACKAGE_JSON_CONTENT = JSON.stringify({ name: 'wxl', version: '3.0.0' }, null, 2) + '\n'

export const README_CONTENT = '# wxl\n\nA pristine range fixture.\n'

export const NESTED_FILE_CONTENT = "export const hello = 'world'\n"

/** Entries without the archive's GitHub-style prefix. */
export const PRISTINE_FIXTURE = [
  { path: 'CHANGELOG.md', type: 'file', mode: 0o644, content: CHANGELOG_CONTENT },
  { path: '.proj.specs/', type: 'dir', mode: 0o755 },
  { path: '.proj.specs/OPEN-QUESTIONS.md', type: 'file', mode: 0o644, content: OPEN_QUESTIONS_CONTENT },
  { path: 'package.json', type: 'file', mode: 0o644, content: PACKAGE_JSON_CONTENT },
  { path: 'README.md', type: 'file', mode: 0o644, content: README_CONTENT },
  { path: 'src/', type: 'dir', mode: 0o755 },
  { path: 'src/index.js', type: 'file', mode: 0o644, content: NESTED_FILE_CONTENT },
]
