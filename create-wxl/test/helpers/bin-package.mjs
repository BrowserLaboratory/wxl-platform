// Builds a temporary installed-package directory for `bin.test.mjs` (T-0025 ticket Notes, "bin
// 測試要有暫存套件目錄"): real copies of `bin/`, `src/` and `package.json`, `node_modules` linked
// to the real one, and `dist/` built by `prepareDist` on a throwaway 0005-S2 fixture (so it is a
// genuine, hash-consistent package source record and engine, not a hand-written stand-in).

import { cp, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makePublishFixture, buildRelease, cleanupFixture } from './publish-fixture.mjs'
import { makeTmpRoot } from './tmp.mjs'

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const REAL_CREATE_WXL_NODE_MODULES = fileURLToPath(new URL('../../node_modules', import.meta.url))

export async function makeBinPackage() {
  const fixture = await makePublishFixture()
  await buildRelease(fixture, { tag: 'none' })

  const packageDir = await makeTmpRoot('create-wxl-bin-package-')
  await cp(join(REPO_ROOT, 'create-wxl/bin'), join(packageDir, 'bin'), { recursive: true })
  await cp(join(REPO_ROOT, 'create-wxl/src'), join(packageDir, 'src'), { recursive: true })
  await cp(join(REPO_ROOT, 'create-wxl/package.json'), join(packageDir, 'package.json'))
  await cp(join(fixture.createWxlDir, 'dist'), join(packageDir, 'dist'), { recursive: true })
  try {
    await symlink(REAL_CREATE_WXL_NODE_MODULES, join(packageDir, 'node_modules'), 'junction')
  } catch {
    await symlink(REAL_CREATE_WXL_NODE_MODULES, join(packageDir, 'node_modules'))
  }

  return {
    packageDir,
    binPath: join(packageDir, 'bin/create-wxl.mjs'),
    distPath: join(packageDir, 'dist'),
    async cleanup() {
      await cleanupFixture(fixture)
      await rm(packageDir, { recursive: true, force: true })
    },
  }
}
