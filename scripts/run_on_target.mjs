// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as childProcess from 'child_process';
import * as fs from 'fs';
import ora from 'ora';
import * as path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { build, prepareBuild } from './devtools_build.mjs';
import { isInChromiumDirectory } from './devtools_paths.js';
import { ENV, getEnvString } from './env-utils.mjs';

const options = yargs(hideBin(process.argv))
  .parserConfiguration({
    // Populate the ['_'] with unknown
    'unknown-options-as-args': true,
  })
  .command(
    '$0 [script]',
    'Run any script that is generated inside out/<target>/gen',
  )
  .options('skip-ninja', {
    type: 'boolean',
    default: false,
    desc: 'Skip rebuilding',
  })
  .option('target', {
    alias: 't',
    type: 'string',
    default: getEnvString(ENV.TARGET, 'Default'),
  })
  .help(false)
  .version(false)
  .parseSync();

const target = options.target;
/** @type {string} */
let script = options.script;

let sourceRoot = path.dirname(path.dirname(path.resolve(options['$0'])));

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
const scriptPath = path.resolve(cwd, script);

if (!options['skip-ninja']) {
  if (!fs.existsSync(scriptPath)) {
    console.error(`Script path ${scriptPath} does not exist, trying ninja...`);
    // Prepare the build target if not initialized.
    prepareBuild(target);
  }

  const spinner = ora('Rebuilding...').start();
  const extraBuildTargets = isInChromiumDirectory().isInChromium
    ? ['chrome']
    : [];

  await build(target, {
    extraBuildTargets,
  });
  spinner.clear();
}

const { argv0 } = process;

const { status } = childProcess.spawnSync(
  argv0,
  [scriptPath, ...options['_'].map(String)],
  {
    stdio: 'inherit',
    env,
  },
);
process.exit(status);
