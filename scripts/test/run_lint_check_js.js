// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Use V8's code cache to speed up instantiation time.
require('v8-compile-cache');

const path = require('path');
const CLIEngine = require('eslint').CLIEngine;

const ROOT_DIRECTORY = path.join(__dirname, '..', '..');
const FRONT_END_DIRECTORY = path.join(ROOT_DIRECTORY, 'front_end');
const INSPECTOR_OVERLAY_DIRECTORY = path.join(ROOT_DIRECTORY, 'inspector_overlay');
const TEST_DIRECTORY = path.join(ROOT_DIRECTORY, 'test');
const SCRIPTS_DIRECTORY = path.join(ROOT_DIRECTORY, 'scripts');

const DEFAULT_DIRECTORIES_TO_LINT =
    [FRONT_END_DIRECTORY, INSPECTOR_OVERLAY_DIRECTORY, TEST_DIRECTORY, SCRIPTS_DIRECTORY];

const eslintignorePath = path.join(ROOT_DIRECTORY, '.eslintignore');

let directoriesOrFilesToLint = process.argv.slice(2);

if (directoriesOrFilesToLint.length === 0) {
  directoriesOrFilesToLint = DEFAULT_DIRECTORIES_TO_LINT;
}

const cli = new CLIEngine({
  extensions: ['.js', '.ts'],
  ignorePath: eslintignorePath,
  fix: true,
});

// We filter out certain files in the `.eslintignore`. However, ESLint produces warnings
// when you include a particular file that is ignored. This means that if you edit a file
// that is directly ignored in the `.eslintignore`, ESLint would report a failure.
// This was originally reported in https://github.com/eslint/eslint/issues/9977
// The suggested workaround is to use the CLIEngine to pre-emptively filter out these
// problematic paths.
const filteredFilesToLint = directoriesOrFilesToLint.filter(path => !cli.isPathIgnored(path));

const report = cli.executeOnFiles(filteredFilesToLint);

// Write fixes to the filesystem
CLIEngine.outputFixes(report);
console.log(cli.getFormatter()(report.results));

const hasProblems = report.errorCount + report.warningCount > 0;
process.exit(hasProblems ? 1 : 0);
