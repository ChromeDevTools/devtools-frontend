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

if (!fs.existsSync(cwd)) {
  throw new Error(`Target directory ${cwd} does not exist`);
}
if (!fs.statSync(cwd).isDirectory()) {
  throw new Error(`Target path ${cwd} is not a  directory`);
}

const {argv0} = process;
childProcess.spawnSync(argv0, [path.resolve(cwd, script), ...unparse(argv)], {stdio: 'inherit'});
