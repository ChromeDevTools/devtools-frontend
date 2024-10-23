// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This file contains helpers to load the correct path to various scripts and
 * directories. It is the Node equivalent of devtools_paths.py.
 *
 * Note that not all paths implemented in devtools_paths.py are implemented
 * here. Please add any paths you need that are missing.
 */

const path = require('path');
const os = require('os');

/**
 * You would think we can use __filename here but we cannot because __filename
 * has any symlinks resolved. This means we can't use it to tell if the user is
 * using the external repo with a standalone build setup because the symlink
 * from chromium/src/third_party/devtools-frontend => devtools-frontend repo
 * gets resolved by Node before it gives us __filename.
 *
 * We can use process.argv[1], which is the path to the file currently being
 * executed without any symlinks resolution. If we assume that file is always in
 * the devtools-frontend repository/directory, we can use that file as the
 * starting point for figuring out if we're in Chromium or not. until we find
 * the scripts directory, at which point we've found this file and can use it
 * for all subsequent logic.
 *
 * e.g. the user executes a script: scripts/test/run_lint_check.js
 *
 * process.argv[1] =
 * /full/path/devtools-frontend/src/scripts/test/run_lint_check.js
 */
const PATH_TO_EXECUTED_FILE = process.argv[1];

const _lookUpCaches = new Map(
    [['chromium', null]],
);
/**
 * This function figures out if we're within a chromium directory, and therefore
 * we are in the integrated workflow mode, rather than working in a standalone
 * devtools-frontend repository.
 */
function isInChromiumDirectory() {
  const cached = _lookUpCaches.get('chromium');
  if (cached) {
    return cached;
  }

  const normalizedPath = PATH_TO_EXECUTED_FILE.split(path.sep).join('/');
  const devtoolsPath = 'src/third_party/devtools-frontend';
  const isInChromium = normalizedPath.includes(devtoolsPath);
  const potentialChromiumDir = PATH_TO_EXECUTED_FILE.substring(0, normalizedPath.indexOf(devtoolsPath));
  const result = {isInChromium, chromiumDirectory: potentialChromiumDir};
  _lookUpCaches.set('chromium', result);
  return result;
}
/**
 * Returns the path to the root of the devtools-frontend repository.
 *
 * If we're in Chromium, this will be /path/to/chromium/src/third_party/devtools-frontend/src
 * If it's standalone, it will be /path/to/devtools-frontend
 */
function devtoolsRootPath() {
  return path.dirname(__dirname);
}

/**
 * Returns the path to the root of the main repository we're in.
 * if we're in Chromium, this is /path/to/chromium/src
 * if we're in standalone, this is /path/to/devtools-frontend
 *
 * Note this is different to devtoolsRootPath(), which always returns the path
 * to the devtools-frontend source code.
 */
function rootPath() {
  const {isInChromium, chromiumDirectory} = isInChromiumDirectory();
  if (isInChromium) {
    return path.join(chromiumDirectory, 'src');
  }
  return devtoolsRootPath();
}

/**
 * Path to the third_party directory. Used because if we're running in Chromium
 * land we need to use e.g. the Node executable from Chromium's third_party
 * directory, not from the devtools-frontend third_party directory.
 */
function thirdPartyPath() {
  return path.join(rootPath(), 'third_party');
}

function devToolsThirdPartyPath() {
  const {isInChromium} = isInChromiumDirectory();
  if (isInChromium) {
    return path.join(rootPath(), 'third_party', 'devtools-frontend', 'src', 'third_party');
  }
  return thirdPartyPath();
}

function nodePath() {
  const paths = {
    darwin: path.join(
        process.arch === 'arm64' ? 'mac_arm64' : 'mac',
        process.arch === 'arm64' ? 'node-darwin-arm64' : 'node-darwin-x64', 'bin', 'node'),
    linux: path.join('linux', 'node-linux-x64', 'bin', 'node'),
    win32: path.join('win', 'node.exe'),
  };
  return path.join(thirdPartyPath(), 'node', paths[os.platform()]);
}

/**
 * The path to the devtools-frontend node_modules folder.
 */
function nodeModulesPath() {
  return path.join(devtoolsRootPath(), 'node_modules');
}

function stylelintExecutablePath() {
  return path.join(nodeModulesPath(), 'stylelint', 'bin', 'stylelint.js');
}

function mochaExecutablePath() {
  return path.join(nodeModulesPath(), 'mocha', 'bin', 'mocha');
}

function litAnalyzerExecutablePath() {
  return path.join(nodeModulesPath(), 'lit-analyzer', 'cli.js');
}

/**
 * Computes the path to the toplevel `tsconfig.json`.
 *
 * @returns the path to the toplevel `tsconfig.json`.
 */
function tsconfigJsonPath() {
  return path.join(devtoolsRootPath(), 'tsconfig.json');
}

function downloadedChromeBinaryPath() {
  const paths = {
    linux: path.join('chrome-linux', 'chrome'),
    darwin: path.join('chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    win32: path.join('chrome-win', 'chrome.exe'),
  };
  return path.join(devToolsThirdPartyPath(), 'chrome', paths[os.platform()]);
}

module.exports = {
  thirdPartyPath,
  nodePath,
  devtoolsRootPath,
  nodeModulesPath,
  mochaExecutablePath,
  stylelintExecutablePath,
  downloadedChromeBinaryPath,
  litAnalyzerExecutablePath,
  tsconfigJsonPath,
};
