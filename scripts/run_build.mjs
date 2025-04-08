// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'node:fs';
import path from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { build, prepareBuild } from './devtools_build.mjs';

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

const { target, watch, skipInitialBuild } = argv;
const timeFormatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'second',
  unitDisplay: 'narrow',
  maximumFractionDigits: 2,
});

// Prepare the build target if not initialized.
try {
  await prepareBuild(target);
} catch (error) {
  console.log(error.toString());
  process.exit(1);
}

// Perform an initial build (unless we should skip).
if (!skipInitialBuild) {
  console.log('Building…');
  try {
    const { time } = await build(target);
    console.log(`Build ready (${timeFormatter.format(time)})`);
  } catch (error) {
    console.log(error.toString());
    process.exit(1);
  }
}

if (watch) {
  let timeoutId = -1;
  let buildPromise = Promise.resolve();
  let abortController = new AbortController();

  function watchCallback(eventType, filename) {
    if (eventType !== 'change') {
      return;
    }
    if (!/^(BUILD\.gn)|(.*\.(css|js|ts))$/.test(filename)) {
      return;
    }
    clearTimeout(timeoutId);
    timeoutId = setTimeout(watchRebuild, 250);
  }

  function watchRebuild() {
    // Abort any currently running build.
    abortController.abort();
    abortController = new AbortController();
    const { signal } = abortController;

    buildPromise = buildPromise.then(async () => {
      try {
        console.log('Rebuilding...');
        const { time } = await build(target, signal);
        console.log(`Rebuild successfully (${timeFormatter.format(time)})`);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.log(error.toString());
        }
      }
    });
  }

  const WATCHLIST = ['front_end', 'test'];
  for (const dirname of WATCHLIST) {
    fs.watch(dirname, { recursive: true }, (eventType, filename) =>
      watchCallback(eventType, path.join(dirname, filename)),
    );
  }
}
