// A sentinel directory and file placed in a run's parent directory before the run (T-0024 ticket
// Notes): proves any temporary-directory cleanup removes ITS OWN path, never anything matching a
// pattern like `.create-wxl-*`.

import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect } from 'vitest'

export const SENTINEL_DIR = '.create-wxl-sentinel'
export const SENTINEL_FILE = '.create-wxl-sentinel-file'
const SENTINEL_FILE_CONTENT = 'sentinel\n'
const SENTINEL_CHILD_CONTENT = 'sentinel child\n'

export async function placeSentinel(parentDir) {
  const dir = join(parentDir, SENTINEL_DIR)
  await mkdir(dir)
  await writeFile(join(dir, 'child'), SENTINEL_CHILD_CONTENT)
  await writeFile(join(parentDir, SENTINEL_FILE), SENTINEL_FILE_CONTENT)
}

/** Asserts the parent directory still holds exactly the sentinel (byte-identical) and nothing
 * else beginning with `.create-wxl-`, so a cleanup that deleted-by-pattern instead of by path
 * would be caught even when it happened to also delete the right directory. */
export async function expectOnlySentinel(parentDir, { extraNames = [] } = {}) {
  const names = (await readdir(parentDir)).sort()
  const expected = [SENTINEL_DIR, SENTINEL_FILE, ...extraNames].sort()
  expect(names).toEqual(expected)
  const createWxlLeftovers = names.filter((n) => n.startsWith('.create-wxl-') && n !== SENTINEL_DIR && n !== SENTINEL_FILE)
  expect(createWxlLeftovers).toEqual([])
  expect(await readFile(join(parentDir, SENTINEL_FILE), 'utf8')).toBe(SENTINEL_FILE_CONTENT)
  expect(await readFile(join(parentDir, SENTINEL_DIR, 'child'), 'utf8')).toBe(SENTINEL_CHILD_CONTENT)
}
