import { mkdtemp, realpath } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** A fresh temporary root directory, resolved through `realpath` (macOS's tmpdir is itself a
 * symlink). Shared by every `create-wxl/test/*.test.mjs` file (S-30); `prefix` lets a caller keep
 * a descriptive directory name (e.g. `create-wxl-publish-`) while still going through the one
 * realpath'd `mkdtemp` call every test file shares. */
export async function makeTmpRoot(prefix = 'create-wxl-test-') {
  const dir = await mkdtemp(join(tmpdir(), prefix))
  return realpath(dir)
}
