#!/usr/bin/env node
// Thin script `prepublishOnly` runs right after its own `prepare-dist.mjs` (traceability.md
// "Package and publishing"): wires the real git, `npm view`/`npm whoami` and `git archive`
// (`src/publish-io.mjs`, platform- and E404-aware) into `checkPublish`, run against the package
// root (this script's parent directory). No logic of its own lives here (stage 6/7 fix
// assignment section C, S-33's "thin script" framing).

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as nodeModule from 'node:module'
import { checkPublish, PublishError } from '../src/publish.mjs'
import { createSpawnGitRunner } from '../src/git-runner.mjs'
import { createNpmView, createNpmWhoami, createArchive } from '../src/publish-io.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

try {
  await checkPublish({
    root,
    module: nodeModule,
    runGit: createSpawnGitRunner(),
    archive: createArchive({ root }),
    npmView: createNpmView({ root }),
    npmWhoami: createNpmWhoami({ root }),
  })
} catch (err) {
  if (err instanceof PublishError) {
    process.stderr.write(`checkPublish failed: ${err.message}\n`)
    process.exitCode = 1
  } else {
    throw err
  }
}
