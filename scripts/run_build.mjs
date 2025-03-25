// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
                 .option('target', {
                   alias: 't',
                   type: 'string',
                   default: 'Default',
                   description: 'Specify the target build subdirectory under //out',
                 })
                 .option('skip-initial-build', {
                   type: 'boolean',
                   default: false,
                   description: 'Skip the initial build (use with --watch)',
                   implies: 'watch',
                 })
                 .option('watch', {
                   alias: 'w',
                   type: 'boolean',
                   default: false,
                   description: 'Monitor for changes and automatically rebuild',
                 })
                 .usage('npm run build -- [options]')
                 .help('help')
                 .version(false)
                 .parseSync();

const {target, watch, skipInitialBuild} = argv;
const cwd = process.cwd();
const {env} = process;

// Create and initialize the `out/<target>` directory as needed.
const outDir = path.join('out', target);
if (!fs.existsSync(outDir)) {
  const gnExe = path.join(cwd, 'third_party', 'depot_tools', 'gn');
  fs.mkdirSync(outDir, {recursive: true});
  childProcess.spawnSync(gnExe, ['-q', 'gen', outDir], {
    cwd,
    env,
    stdio: 'inherit',
  });
  console.log(`Initialized output directory ${outDir}`);
}

function build() {
  const autoninjaExe = path.join(cwd, 'third_party', 'depot_tools', 'autoninja');
  childProcess.spawnSync(autoninjaExe, ['-C', outDir], {
    cwd,
    env,
    stdio: 'inherit',
  });
}

// Perform an initial build (unless we should skip).
if (!skipInitialBuild) {
  build();
}

if (watch) {
  let timeoutId = -1;

  function watchCallback(eventType, filename) {
    if (eventType !== 'change') {
      return;
    }
    if (['BUILD.gn'].includes(filename) || ['.css', '.js', '.ts'].includes(path.extname(filename))) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(build, 250);
    }
  }

  const WATCHLIST = ['front_end', 'inspector_overlay', 'test'];
  for (const dirname of WATCHLIST) {
    fs.watch(
        dirname,
        {recursive: true},
        (eventType, filename) => watchCallback(eventType, path.join(dirname, filename)),
    );
  }
}
