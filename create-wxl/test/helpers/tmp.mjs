import { mkdtemp, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** A fresh temporary root directory, resolved through `realpath` (macOS's tmpdir is itself a
 * symlink). Shared by every `create-wxl/test/*.test.mjs` file (S-30). */
export async function makeTmpRoot() {
  const dir = await mkdtemp(join(tmpdir(), 'create-wxl-test-'))
  return realpath(dir)
}
