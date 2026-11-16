// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This file contains helpers to load the correct path to various scripts and
 * directories. It is the Node equivalent of devtools_paths.py.
 *
 * Note that not all paths implemented in devtools_paths.py are implemented
 * here. Please add any paths you need that are missing.
 */

import childProcess from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const _lookUpCaches = new Map();

/**
 * This function figures out if we're within a chromium directory, and therefore
 * we are in the integrated workflow mode, rather than working in a standalone
 * devtools-frontend repository.
 *
 * The location of DevTools inside of Chromium is not hard-coded. Instead,
 * `find_chromium_root.py` looks at the `.gclient` file of the checkout. We run
 * that script here so there is only a single implementation of the logic.
 *
 * @returns {{isInChromium: boolean, chromiumDirectory: string}}
 */
export function isInChromiumDirectory() {
  const cached = _lookUpCaches.get('chromium');
  if (cached) {
    return cached;
  }

  const scriptArgs = [
    path.join(import.meta.dirname, 'find_chromium_root.py'),
    '--devtools-root',
    devtoolsRootPath(),
  ];
  // On Windows `python3` is a batch file from depot_tools.
  const [exe, args] = os.platform() === 'win32' ? [process.env.ComSpec ?? 'cmd.exe', ['/c', 'python3', ...scriptArgs]] :
                                                  ['python3', scriptArgs];
  const chromiumDirectory = childProcess
                                .execFileSync(exe, args, {
                                  encoding: 'utf-8',
                                  stdio: ['ignore', 'pipe', 'inherit'],
                                })
                                .trim();
  const result = {isInChromium: chromiumDirectory !== '', chromiumDirectory};
  _lookUpCaches.set('chromium', result);
  return result;
}

/**
 * Returns the path to the root of the devtools-frontend repository.
 *
 * If we're in Chromium, this will be e.g. /path/to/chromium/src/third_party/devtools
 * If it's standalone, it will be /path/to/devtools-frontend
 */
export function devtoolsRootPath() {
  return path.dirname(import.meta.dirname);
}

/**
 * Returns the path of the DevTools directory relative to `rootPath()`.
 *
 * If we're in Chromium, this is the location of DevTools inside of
 * chromium/src, e.g. `third_party/devtools`. This is also where the build
 * output of DevTools is located inside of the `gen` directory.
 * If it's standalone, this is the empty string.
 */
export function devtoolsPathRelativeToRoot() {
  const {isInChromium, chromiumDirectory} = isInChromiumDirectory();
  if (!isInChromium) {
    return '';
  }
  return path.relative(chromiumDirectory, devtoolsRootPath());
}

/**
 * Returns the path to the root of the main repository we're in.
 * if we're in Chromium, this is /path/to/chromium/src
 * if we're in standalone, this is /path/to/devtools-frontend
 *
 * Note this is different to devtoolsRootPath(), which always returns the path
 * to the devtools-frontend source code.
 */
export function rootPath() {
  const {isInChromium, chromiumDirectory} = isInChromiumDirectory();
  if (isInChromium) {
    return chromiumDirectory;
  }
  return devtoolsRootPath();
}

/**
 * Path to the third_party directory. Used because if we're running in Chromium
 * land we need to use e.g. the Node executable from Chromium's third_party
 * directory, not from the devtools-frontend third_party directory.
 */
export function thirdPartyPath() {
  return path.join(rootPath(), 'third_party');
}

/**
 * Path to the third_party directory of DevTools itself, regardless of whether
 * we're in Chromium or in a standalone checkout.
 */
export function devToolsThirdPartyPath() {
  return path.join(devtoolsRootPath(), 'third_party');
}

export function nodePath() {
  const paths = {
    darwin: path.join(
        process.arch === 'arm64' ? 'mac_arm64' : 'mac',
        process.arch === 'arm64' ? 'node-darwin-arm64' : 'node-darwin-x64',
        'bin',
        'node',
        ),
    linux: path.join('linux', 'node-linux-x64', 'bin', 'node'),
    win32: path.join('win', 'node.exe'),
  };
  return path.join(thirdPartyPath(), 'node', paths[os.platform()]);
}

/**
 * The path to the devtools-frontend node_modules folder.
 */
export function nodeModulesPath() {
  return path.join(devtoolsRootPath(), 'node_modules');
}

export function autoninjaPyPath() {
  return path.join(thirdPartyPath(), 'depot_tools', 'autoninja.py');
}

export function vpython3ExecutablePath() {
  return path.join(
      thirdPartyPath(),
      'depot_tools',
      os.platform() === 'win32' ? 'vpython3.bat' : 'vpython3',
  );
}

export function gnPyPath() {
  return path.join(thirdPartyPath(), 'depot_tools', 'gn.py');
}

export function stylelintExecutablePath() {
  return path.join(nodeModulesPath(), 'stylelint', 'bin', 'stylelint.js');
}

export function mochaExecutablePath() {
  return path.join(nodeModulesPath(), 'mocha', 'bin', 'mocha');
}

export function litAnalyzerExecutablePath() {
  return path.join(nodeModulesPath(), 'lit-analyzer', 'cli.js');
}

/**
 * Computes the path to the toplevel `tsconfig.json`.
 *
 * @returns the path to the toplevel `tsconfig.json`.
 */
export function tsconfigJsonPath() {
  return path.join(devtoolsRootPath(), 'front_end', 'tsconfig.json');
}

export function typescriptPyPath() {
  return path.join(devtoolsRootPath(), 'third_party', 'typescript', 'typescript.py');
}

export function downloadedChromeBinaryPath() {
  const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
  const paths = {
    linux: path.join('chrome-linux', 'chrome-linux64', 'chrome'),
    darwin: path.join(
        `chrome-mac-${arch}`,
        `chrome-mac-${arch}`,
        'Google Chrome for Testing.app',
        'Contents',
        'MacOS',
        'Google Chrome for Testing',
        ),
    win32: path.join('chrome-win', 'chrome-win64', 'chrome.exe'),
  };
  return path.join(devToolsThirdPartyPath(), 'chrome', paths[os.platform()]);
}
