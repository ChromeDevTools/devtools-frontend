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
  const {glob, files, _, $0, ...flagsForStylelint} = yargsObject;

  /*
   * This reduce is a flatten, because our Node version
   * doesn't have flatMap :(
   */
  const extraFlagsForStylelint =
      Object.keys(flagsForStylelint).map(key => [`--${key}`, flagsForStylelint[key]]).reduce((a, b) => a.concat(b), []);

  const args = [
    stylelintExecutablePath(), ...getCSSFilesOrGlobList(), '--fix', '--allow-empty-input', ...extraFlagsForStylelint
  ];

  const result =
      childProcess.spawnSync(nodePath(), args, {encoding: 'utf-8', cwd: devtoolsRootPath(), stdio: 'inherit'});
  process.exit(result.status);
}

run();
