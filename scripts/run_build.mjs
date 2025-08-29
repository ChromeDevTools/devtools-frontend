// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'node:fs';
import path from 'node:path';
import ora from 'ora';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {build, prepareBuild} from './devtools_build.mjs';

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
const timeFormatter = new Intl.NumberFormat('en-US', {
  style: 'unit',
  unit: 'second',
  unitDisplay: 'narrow',
  maximumFractionDigits: 2,
});

// Prepare the build target if not initialized.
const spinner = ora('Preparing…').start();
try {
  const gnArgs = await prepareBuild(target);
  if (watch) {
    if (gnArgs.get('devtools_bundle') !== 'false') {
      spinner.info(
          'Using watch mode with full rebuilds. Use `gn gen out/' + target +
          ' --args="devtools_bundle=false"` to enable fast rebuilds.');
    } else {
      spinner.warn(
          'Using watch mode with fast rebuilds (since `devtools_bundle=false`' +
          ' for //out/' + target + '). Be aware that fast rebuilds are a best' +
          ' effort and might not work reliably in all cases.');
    }
  }
  spinner.clear();
} catch (error) {
  spinner.fail(error.message);
  process.exit(1);
}

// Perform an initial build (unless we should skip).
if (!skipInitialBuild) {
  spinner.start('Building…');
  try {
    const {time} = await build(target);
    spinner.succeed(`Build ready (${timeFormatter.format(time)})`);
  } catch (error) {
    spinner.fail(error.message);
    process.exit(1);
  }
}

spinner.stop();

if (watch) {
  let timeoutId = -1;
  let buildPromise = Promise.resolve();
  let abortController = new AbortController();
  const changes = new Set();

  function watchCallback(eventType, filename) {
    if (eventType !== 'change' && eventType !== 'rename') {
      return;
    }
    if (!/^(BUILD\.gn)|(.*\.(css|js|ts))$/.test(filename)) {
      return;
    }
    changes.add(filename);
    clearTimeout(timeoutId);
    timeoutId = setTimeout(watchRebuild, 250);
  }

  function watchRebuild() {
    // Abort any currently running build.
    abortController.abort();
    abortController = new AbortController();
    const {signal} = abortController;
    const filenames = [...changes];
    changes.clear();

    buildPromise = buildPromise.then(async () => {
      try {
        spinner.start('Rebuilding...');
        const {time} = await build(target, signal, filenames);
        spinner.succeed(`Rebuild successfully (${timeFormatter.format(time)})`);
      } catch (error) {
        if (error.name !== 'AbortError') {
          spinner.fail(error.message);
        }
      }
    });
  }

  const WATCHLIST = ['front_end', 'test'];
  for (const dirname of WATCHLIST) {
    fs.watch(
        dirname,
        {recursive: true},
        (eventType, filename) => watchCallback(eventType, path.join(dirname, filename)),
    );
  }
}
