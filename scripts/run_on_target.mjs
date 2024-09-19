// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import unparse from 'yargs-unparser';

const argv = yargs(process.argv.slice(2))
                 .command('$0 [script]')
                 .option('target', {alias: 't', type: 'string', default: 'Default'})
                 .help(false)
                 .version(false)
                 .argv;

const target = argv['target'];
let script = argv['script'];

delete argv['target'];
delete argv['t'];
delete argv['script'];

let sourceRoot = path.dirname(path.dirname(path.resolve(argv['$0'])));

// Ensure that we can find the node_modules folder even if the out folder is
// not a sibling of the node_modules folder.
const env = process.env;
env.NODE_PATH = path.join(sourceRoot, 'node_modules');

let cwd = path.join(sourceRoot, 'out', target);

if (!fs.existsSync(cwd)) {
  // Check if we are in a Chromium checkout and look for the out folder there.
  const maybeChromiumRoot = path.dirname(path.dirname(path.dirname(sourceRoot)));
  if (sourceRoot === path.join(maybeChromiumRoot, 'third_party', 'devtools-frontend', 'src')) {
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

if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory() || !fs.existsSync(path.join(cwd, 'build.ninja'))) {
  console.error(
      `Target path ${cwd} does not exist or is not a directory. Please run 'gn gen out/${target}' first.`);
  process.exit(1);
}
const scriptPath = path.resolve(cwd, script)
if (!fs.existsSync(scriptPath)) {
  console.error(`Script path ${scriptPath} does not exist, trying ninja...`);
  const {error, status} = childProcess.spawnSync('autoninja', ['-C', cwd, script], {stdio: 'inherit', cwd: sourceRoot});
  if (error) {
    throw error;
  }
  if (status) {
    process.exit(status);
  }
}

const {argv0} = process;
const {status} = childProcess.spawnSync(argv0, [scriptPath, ...unparse(argv)], {stdio: 'inherit', env});
process.exit(status);
