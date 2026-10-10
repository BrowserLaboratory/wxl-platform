/**
 * Tests for scripts/pre-commit.sh
 *
 * Creates a temporary git repo with a challenge structure, stages files in
 * various configurations, and runs pre-commit.sh to verify correct behavior.
 */

import { mkdtempSync, writeFileSync, mkdirSync, rmSync, chmodSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

const PROJECT_ROOT = resolve(import.meta.dirname, '..')
const PRE_COMMIT_SH = resolve(PROJECT_ROOT, 'scripts/pre-commit.sh')
const LINT_STAGED_TS = resolve(PROJECT_ROOT, 'scripts/challenge-lint-staged.ts')

function git(cwd: string, cmd: string): string {
  return execSync(`git ${cmd}`, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
}

function runPreCommit(cwd: string): { exitCode: number; stderr: string } {
  // Use the local pre-commit.sh created in setupChallengeRepo (has absolute path to lint-staged.ts)
  const localScript = join(cwd, 'scripts/pre-commit.sh')
  try {
    execSync(`bash ${localScript}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PATH: process.env.PATH },
    })
    return { exitCode: 0, stderr: '' }
  } catch (err: any) {
    return { exitCode: err.status ?? 1, stderr: err.stderr ?? '' }
  }
}

function setupChallengeRepo(tmpDir: string): void {
  git(tmpDir, 'init')
  git(tmpDir, 'config user.email "test@test.com"')
  git(tmpDir, 'config user.name "Test"')

  // Create a valid challenge structure
  const slugDir = join(tmpDir, 'platform/challenge/test-chall')
  const srcDir = join(slugDir, 'src')
  mkdirSync(srcDir, { recursive: true })

  writeFileSync(join(slugDir, 'index.md'), [
    '---',
    'title: "Test Challenge"',
    'number: 1',
    'backend: flask',
    'app: app.py',
    '---',
    '',
    'Test challenge content',
  ].join('\n'))
  writeFileSync(join(srcDir, 'app.py'), 'from flask import Flask\napp = Flask(__name__)')
  writeFileSync(join(srcDir, 'flag.txt'), 'FLAG{test-flag}')

  // Copy the lint-staged script so it can be found relative to pre-commit.sh
  const scriptsDir = join(tmpDir, 'scripts')
  mkdirSync(scriptsDir, { recursive: true })

  // Create a symlink or copy of the necessary scripts
  // We need challenge-lint-staged.ts to be importable, so we use the project root's scripts
  // Instead, we'll create a wrapper that calls the real script with the correct challenge dir
  writeFileSync(join(scriptsDir, 'pre-commit.sh'), `#!/usr/bin/env bash
set -euo pipefail
CHALLENGE_FILES=$(git diff --cached --name-only --diff-filter=ACMRD -- 'platform/challenge/')
if [ -z "$CHALLENGE_FILES" ]; then
  exit 0
fi
HAS_STASHABLE=false
if ! git diff --quiet -- platform/ || [ -n "$(git ls-files --others --exclude-standard -- platform/)" ]; then
  HAS_STASHABLE=true
fi
if [ "$HAS_STASHABLE" = true ]; then
  git stash push --keep-index --include-untracked --quiet -m "pre-commit: stash unstaged changes" -- platform/
fi
VALIDATION_EXIT=0
CHALLENGE_FILE_LIST=()
while IFS= read -r line; do
  [ -n "$line" ] && CHALLENGE_FILE_LIST+=("$line")
done <<< "$CHALLENGE_FILES"
node --experimental-strip-types ${LINT_STAGED_TS} "\${CHALLENGE_FILE_LIST[@]}" || VALIDATION_EXIT=$?
if [ "$HAS_STASHABLE" = true ]; then
  git stash pop --quiet
fi
exit $VALIDATION_EXIT
`)
  chmodSync(join(scriptsDir, 'pre-commit.sh'), 0o755)

  // Initial commit so we have a HEAD to diff against
  git(tmpDir, 'add .')
  git(tmpDir, 'commit -m "initial"')
}

describe('pre-commit.sh', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pre-commit-test-'))
    setupChallengeRepo(tmpDir)
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('exits 0 when no challenge files are staged', () => {
    // Stage a non-challenge file
    writeFileSync(join(tmpDir, 'README.md'), '# Hello')
    git(tmpDir, 'add README.md')

    const result = runPreCommit(tmpDir)
    expect(result.exitCode).toBe(0)
  })

  it('exits 0 when valid challenge files are staged', () => {
    // Modify the challenge (valid change)
    const indexPath = join(tmpDir, 'platform/challenge/test-chall/index.md')
    writeFileSync(indexPath, [
      '---',
      'title: "Test Challenge Updated"',
      'number: 1',
      'backend: flask',
      'app: app.py',
      '---',
      '',
      'Updated content',
    ].join('\n'))
    git(tmpDir, 'add platform/challenge/test-chall/index.md')

    const result = runPreCommit(tmpDir)
    expect(result.exitCode).toBe(0)
  })

  it('exits 1 when staged deletion removes required flag file', () => {
    // Delete flag.txt via git rm
    git(tmpDir, 'rm platform/challenge/test-chall/src/flag.txt')

    const result = runPreCommit(tmpDir)
    expect(result.exitCode).toBe(1)
  })

  it('exits 1 when staged deletion removes required app file', () => {
    // Delete app.py via git rm
    git(tmpDir, 'rm platform/challenge/test-chall/src/app.py')

    const result = runPreCommit(tmpDir)
    expect(result.exitCode).toBe(1)
  })

  it('validates staged snapshot, not working tree (stash test)', () => {
    // Create a new challenge directory with only index.md staged, but
    // flag.txt exists on disk (unstaged). The validator should fail because
    // flag.txt is not in the staged snapshot.
    const newSlug = join(tmpDir, 'platform/challenge/new-chall')
    const newSrc = join(newSlug, 'src')
    mkdirSync(newSrc, { recursive: true })

    writeFileSync(join(newSlug, 'index.md'), [
      '---',
      'title: "New Challenge"',
      'number: 1',
      'backend: flask',
      'app: app.py',
      '---',
      '',
      'New challenge',
    ].join('\n'))
    writeFileSync(join(newSrc, 'app.py'), 'from flask import Flask')
    writeFileSync(join(newSrc, 'flag.txt'), 'FLAG{new}')

    // Only stage index.md and app.py — NOT flag.txt
    git(tmpDir, 'add platform/challenge/new-chall/index.md')
    git(tmpDir, 'add platform/challenge/new-chall/src/app.py')
    // flag.txt exists on disk but is NOT staged

    const result = runPreCommit(tmpDir)
    // Should fail because in the staged snapshot, flag.txt doesn't exist
    expect(result.exitCode).toBe(1)
  })

  it('exits 0 when entire challenge directory is removed', () => {
    // Removing a whole challenge is a valid operation — should not block
    git(tmpDir, 'rm -r platform/challenge/test-chall')

    const result = runPreCommit(tmpDir)
    expect(result.exitCode).toBe(0)
  })

  it('exits 1 when only index.md is deleted (incomplete challenge)', () => {
    // Deleting index.md while the directory still exists → incomplete challenge
    git(tmpDir, 'rm platform/challenge/test-chall/index.md')

    const result = runPreCommit(tmpDir)
    expect(result.exitCode).toBe(1)
  })
})
