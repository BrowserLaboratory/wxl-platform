#!/usr/bin/env node
// Thin script `prepublishOnly` runs right after its own `prepare-dist.mjs` (traceability.md
// "Package and publishing"), and spec 0009's `publish-npm.yml` (W6, added by T-0071) runs the same
// pair as its gate step: wires the real git, `git archive` (`src/publish-io.mjs`) and this process's environment
// (X9, spec 0009 K1-K4) into `checkPublish`, run against the package root (this script's parent
// directory). No logic of its own lives here (stage 6/7 fix assignment section C, S-33's "thin
// script" framing).

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as nodeModule from 'node:module'
import { checkPublish, PublishError } from '../src/publish.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { createArchive } from '../src/publish-io.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

try {
  await checkPublish({
    root,
    module: nodeModule,
    runGit: createSpawnGitRunner(),
    archive: createArchive({ root }),
    env: process.env,
  })
} catch (err) {
  if (err instanceof PublishError) {
    process.stderr.write(`checkPublish failed: ${err.message}\n`)
    process.exitCode = 1
  } else {
    throw err
  }
}
