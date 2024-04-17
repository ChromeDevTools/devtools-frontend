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
const script = argv['script'];

delete argv['target'];
delete argv['t'];
delete argv['script'];

const sourceRoot = path.dirname(path.dirname(argv['$0']));
const cwd = path.join(sourceRoot, 'out', target);

if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
  console.error(
      `Target path ${cwd} does not exist or is not a directory. Please run 'gn gen out/${target}' first.`);
  process.exit(1);
}
const scriptPath = path.resolve(cwd, script)
if (!fs.existsSync(scriptPath)) {
  console.error(`Script path ${scriptPath} does not exist, trying ninja...`);
  const {error, status} = childProcess.spawnSync('autoninja', {stdio: 'inherit', cwd});
  if (error) {
    throw error;
  }
  if (status) {
    process.exit(status);
  }
}

const {argv0} = process;
const {status} = childProcess.spawnSync(argv0, [scriptPath, ...unparse(argv)], {stdio: 'inherit'});
process.exit(status);
