// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import yargs from 'yargs';
import unparse from 'yargs-unparser';

import { ENV, getEnvString } from './env-utils.mjs';

const argv = yargs(process.argv.slice(2))
  .parserConfiguration({
    'strip-aliased': true,
  })
  .command('$0 [script]')
  .option('target', {
    alias: 't',
    type: 'string',
    default: getEnvString(ENV.TARGET, 'Default'),
  })
  .option('skip-ninja', {
    type: 'boolean',
    default: false,
  })
  .option('debug', {
    type: 'boolean',
    default: false,
  })
  .help(false)
  .version(false)
  .parseSync();

const target = argv.target;
let script = argv.script;
const skipNinja = argv.skipNinja;
const debug = argv.debug;

delete argv.target;
delete argv.script;

let sourceRoot = path.dirname(path.dirname(path.resolve(argv['$0'])));

// Ensure that we can find the node_modules folder even if the out folder is
// not a sibling of the node_modules folder.
const env = process.env;
env.NODE_PATH = path.join(sourceRoot, 'node_modules');

let cwd = path.join(sourceRoot, 'out', target);

if (!fs.existsSync(cwd)) {
  // Check if we are in a Chromium checkout and look for the out folder there.
  const maybeChromiumRoot = path.dirname(
    path.dirname(path.dirname(sourceRoot)),
  );
  if (
    sourceRoot ===
    path.join(maybeChromiumRoot, 'third_party', 'devtools-frontend', 'src')
  ) {
    sourceRoot = maybeChromiumRoot;
    cwd = path.join(sourceRoot, 'out', target);
    const pathParts = script.split(path.sep);
    if (pathParts[0] === 'gen') {
      pathParts.shift();
      pathParts.unshift('gen', 'third_party', 'devtools-frontend', 'src');
      script = pathParts.join(path.sep);
    }
  }
}

if (
  !fs.existsSync(cwd) ||
  !fs.statSync(cwd).isDirectory() ||
  !fs.existsSync(path.join(cwd, 'build.ninja'))
) {
  console.error(
    `Target path ${cwd} does not exist or is not a directory. Please run 'gn gen out/${target}' first.`,
  );
  process.exit(1);
}

if (!skipNinja) {
  const ninjaCommand = process.platform === 'win32' ? process.env.ComSpec ?? 'cmd.exe' : 'autoninja';
  const ninjaArgs = process.platform === 'win32' ? ['/c', 'autoninja', '-C', cwd, script] : ['-C', cwd, script];
  const { error, status, stdout, stderr } = childProcess.spawnSync(
    ninjaCommand,
    ninjaArgs,
    { stdio: debug ? 'inherit' : 'pipe', cwd: sourceRoot },
  );
  if (status || error) {
    if (stdout) {
      console.log(stdout.toString());
    }
    if (stderr) {
      console.log(stderr.toString());
    }
    if (error) {
      console.error(error);
    }
    process.exit(status ?? 1);
  }
}

const scriptPath = path.resolve(cwd, script);
const { argv0 } = process;
const { status } = childProcess.spawnSync(
  argv0,
  [scriptPath, ...unparse(argv)],
  { stdio: 'inherit', env },
);
process.exit(status);
