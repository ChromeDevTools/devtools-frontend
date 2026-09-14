#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import argparse from 'argparse'
import { loadAll, dump } from 'js-yaml'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))

/// /////////////////////////////////////////////////////////////////////////////

const cli = new argparse.ArgumentParser({
  prog: 'js-yaml',
  add_help: true
})

cli.add_argument('-v', '--version', {
  action: 'version',
  version: pkg.version
})

cli.add_argument('-c', '--compact', {
  help: 'Display errors in compact mode',
  action: 'store_true'
})

// deprecated (not needed after we removed output colors)
// option suppressed, but not completely removed for compatibility
cli.add_argument('-j', '--to-json', {
  help: argparse.SUPPRESS,
  dest: 'json',
  action: 'store_true'
})

cli.add_argument('-t', '--trace', {
  help: 'Show stack trace on error',
  action: 'store_true'
})

cli.add_argument('file', {
  help: 'File to read, utf-8 encoded without BOM',
  nargs: '?',
  default: '-'
})

/// /////////////////////////////////////////////////////////////////////////////

const options = cli.parse_args()

/// /////////////////////////////////////////////////////////////////////////////

// '-' means stdin (fd 0); a terminal there => nothing piped in, show help
if (options.file === '-' && process.stdin.isTTY) {
  cli.print_help()
  process.exit(1)
}

let input

try {
  input = readFileSync(options.file === '-' ? 0 : options.file, 'utf8')
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`File not found: ${options.file}`)
    process.exit(2)
  }

  console.error(
    (options.trace && error.stack) ||
    error.message ||
    String(error))

  process.exit(1)
}

let output
let isYaml

try {
  output = JSON.parse(input)
  isYaml = false
} catch (err) {
  if (err instanceof SyntaxError) {
    try {
      output = []
      loadAll(input, (doc) => { output.push(doc) }, {})
      isYaml = true

      if (output.length === 0) output = null
      else if (output.length === 1) output = output[0]
    } catch (e) {
      if (options.trace && err.stack) console.error(e.stack)
      else console.error(e.toString(options.compact))

      process.exit(1)
    }
  } else {
    console.error(
      (options.trace && err.stack) ||
      err.message ||
      String(err))

    process.exit(1)
  }
}

if (isYaml) console.log(JSON.stringify(output, null, '  '))
else console.log(dump(output))
