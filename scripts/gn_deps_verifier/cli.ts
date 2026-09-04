// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {devtoolsRootPath} from '../devtools_paths.js';

import {logger, setEnabled} from './utils/debug.ts';
import {checkDepsGn} from './validator.ts';

if (!import.meta.main) {
  throw new Error('This script is intended to be run as a command');
}

const argv = yargs(hideBin(process.argv))
                 .scriptName('gn_verifier')
                 .option('root', {
                   type: 'string',
                   description: 'Root directory of the project',
                   default: devtoolsRootPath(),
                 })
                 .option('verbose', {
                   type: 'boolean',
                   description: 'Enable verbose logging',
                   default: false,
                 })
                 .option('all', {
                   type: 'boolean',
                   description: 'Check all targets in front_end',
                   default: false,
                 })
                 .positional('files', {
                   describe: 'Files to check',
                   type: 'string',
                   array: true,
                 })
                 .usage('$0 [files...]', 'Run GN-based dependency check')
                 .parseSync();

setEnabled(argv.verbose);

let files: string[] = argv.files ?? [];

logger(`Running GN-based dependency check on ${argv.root}`);

if (argv.all) {
  // TODO: extend to other folders as well.
  files = [path.join(argv.root, 'front_end')];
}

if (files.length === 0) {
  console.error('Error: No files provided and --all not specified.');
  process.exit(1);
}

try {
  await checkDepsGn(
      argv.root,
      files.map(f => path.resolve(f)),
  );
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
