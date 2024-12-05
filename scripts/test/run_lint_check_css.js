// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const childProcess = require('child_process');
const {
  devtoolsRootPath,
  stylelintExecutablePath,
  nodePath,
} = require('../devtools_paths.js');

const yargsObject = require('yargs')
                        .option('files', {type: 'array', desc: 'One or more files to lint.'})
                        .option('glob', {default: '**/*.css', desc: 'A glob to choose which files to lint.'})
                        .option('cwd', {default: devtoolsRootPath(), desc: 'Working directory to glob from'})
                        .parserConfiguration({
                          // So that if we pass --foo-bar, Yargs only populates
                          // argv with '--foo-bar', not '--foo-bar' and
                          // 'fooBar'. This is important because if we have both
                          // versions and pass them to stylelint, it errors
                          // saying that we've passed the same argument twice.
                          'camel-case-expansion': false
                        })
                        .argv;

// Note: stylelint requires POSIX-formatted paths/globs, even on Windows.
// The forward slash is not a bug.
const DEFAULT_GLOB = '**/*.css';

function getCSSFilesOrGlobList() {
  const files = yargsObject.files || [];
  if (files.length > 0) {
    return files.map(file => {
      // Enforce posix file paths even on Windows
      return file.split(path.sep).join(path.posix.sep);
    });
  }

  return [yargsObject.glob || DEFAULT_GLOB];
}

function run() {
  // eslint-disable-next-line no-unused-vars
  const {glob, files, cwd, _, $0, ...flagsForStylelint} = yargsObject;

  const extraFlagsForStylelint = Object.keys(flagsForStylelint).flatMap(key => [`--${key}`, flagsForStylelint[key]]);

  const args = [
    stylelintExecutablePath(), ...getCSSFilesOrGlobList(), '--fix', '--allow-empty-input', ...extraFlagsForStylelint
  ];
  const result = childProcess.spawnSync(nodePath(), args, {encoding: 'utf-8', cwd, stdio: 'inherit'});
  if (result.error) {
    // If spawnSync returns an error, exit with an error no matter what result.status says.
    console.error(result.error);
    process.exit(1);
    return;
  }
  process.exit(result.status);
}

run();
