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
 * has any symlinks resolved. This means we can't use it to tell if the user
 * is using the external repo with a standalone build setup because the
 * symlink from chromium/src/third_party/devtools-frontend =>
 * devtools-frontend repo gets resolved by Node before it gives us __filename.
 *
 * Instead we can use process.argv, whose first two arguments are the path to
 * the Node binary, and then the path to the file being executed, but without
 * symlinks being resolved. So if this script gets run in the Chromium dir
 * through a symlink, the path will still contain
 * /path/to/chromium/src/third-party/devtools-frontend/scripts/... - this is
 * NOT the case if we were to use __filename.
 */
const ABS_PATH_TO_CURRENT_FILE = process.argv[1];

/** Find the root path of the checkout.
* In the Chromium repository, this is the src/chromium directory.
* In the external repository, standalone build, this is the devtools-frontend directory.
* In the external repository, integrated build, this is the src/chromium directory.
*/
function rootPath() {
  const scriptsPath = path.dirname(ABS_PATH_TO_CURRENT_FILE);
  const devtoolsFrontendPath = path.dirname(scriptsPath);
  const devtoolsFrontendParentPath = path.dirname(devtoolsFrontendPath);

  if (path.basename(devtoolsFrontendParentPath) === 'devtools-frontend') {
    // External repository, integrated build
    // So go up two levels to the src/chromium directory
    return path.dirname(path.dirname(devtoolsFrontendParentPath));
  }

  // External repository, standalone build
  return devtoolsFrontendPath;
}

function thirdPartyPath() {
  path.join(rootPath(), 'third_party');
}

function nodePath() {
  const paths = {
    'darwin': path.join('mac', 'node-darwin-x64', 'bin', 'node'),
    'linux': path.join('linux', 'node-linux-x64', 'bin', 'node'),
    'win32': path.join('win', 'node.exe'),
  };
  return path.join(thirdPartyPath(), 'node', paths[os.platform]);
}

function devtoolsRootPath() {
  return path.dirname(path.dirname(ABS_PATH_TO_CURRENT_FILE));
}

function nodeModulesPath() {
  return path.join(devtoolsRootPath(), 'node_modules');
}

export {thirdPartyPath, nodePath, devtoolsRootPath, nodeModulesPath};
