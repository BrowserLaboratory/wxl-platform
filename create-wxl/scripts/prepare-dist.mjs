#!/usr/bin/env node
// Thin script `prepack` and `prepublishOnly` both run (traceability.md "Package and publishing"):
// wires the real `node:module` into `prepareDist` so `npm pack`/`npm publish` build a real
// `dist/` for the package root (this script's parent directory).

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as nodeModule from 'node:module'
import { prepareDist, PublishError } from '../src/publish.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

try {
  await prepareDist({ root, module: nodeModule })
} catch (err) {
  if (err instanceof PublishError) {
    process.stderr.write(`prepareDist failed: ${err.message}\n`)
    process.exitCode = 1
  } else {
    throw err
  }
}
