// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');

const Flags = {
  DEBUG_DEVTOOLS: '--debug-devtools',
  DEBUG_DEVTOOLS_SHORTHAND: '-d',
  FETCH_CONTENT_SHELL: '--fetch-content-shell',
  CHROMIUM_PATH: '--chromium-path',  // useful for bisecting
  TARGET: '--target',                // build sub-directory (e.g. Release, Default)
};

const IS_DEBUG_ENABLED =
    utils.includes(process.argv, Flags.DEBUG_DEVTOOLS) || utils.includes(process.argv, Flags.DEBUG_DEVTOOLS_SHORTHAND);
const CUSTOM_CHROMIUM_PATH = utils.parseArgs(process.argv)[Flags.CHROMIUM_PATH];
const TARGET = utils.parseArgs(process.argv)[Flags.TARGET] || 'Release';

const PYTHON = process.platform === 'win32' ? 'python.bat' : 'python';

const CURRENT_PATH = process.env.PWD || process.cwd();  // Using env.PWD to account for symlinks.
const isThirdParty = CURRENT_PATH.includes('third_party');
const CHROMIUM_SRC_PATH = CUSTOM_CHROMIUM_PATH || getChromiumSrcPath(isThirdParty);
const RELEASE_PATH = path.resolve(CHROMIUM_SRC_PATH, 'out', TARGET);
const BLINK_TEST_PATH = path.resolve(CHROMIUM_SRC_PATH, 'third_party', 'blink', 'tools', 'run_web_tests.py');
const DEVTOOLS_PATH = path.resolve(CHROMIUM_SRC_PATH, 'third_party', 'devtools-frontend', 'src');
const CACHE_PATH = path.resolve(DEVTOOLS_PATH, '.test_cache');

function main() {
  if (!utils.isDir(CACHE_PATH)) {
    fs.mkdirSync(CACHE_PATH);
  }

  const hasUserCompiledContentShell = utils.isFile(getContentShellBinaryPath(RELEASE_PATH));
  if (!hasUserCompiledContentShell) {
    return;
  }
  const outDir = path.resolve(RELEASE_PATH, '..');

  runTests(outDir, IS_DEBUG_ENABLED);
}
main();


function getChromiumSrcPath(isThirdParty) {
  if (isThirdParty)
  // Assume we're in `chromium/src/third_party/devtools-frontend/src`.
  {
    return path.resolve(CURRENT_PATH, '..', '..', '..');
  }
  // Assume we're in `devtools/devtools-frontend`, where `devtools` is
  // on the same level as `chromium`.
  const srcPath = path.resolve(CURRENT_PATH, '..', '..', 'chromium', 'src');
  if (!utils.isDir(srcPath)) {
    throw new Error(
        `Chromium source directory not found at \`${srcPath}\`. ` +
        'Either move your standalone `devtools/devtools-frontend` checkout ' +
        'so that `devtools` is at the same level as `chromium` in ' +
        '`chromium/src`, or use `--chromium-path`.');
  }
  return srcPath;
}

function getContentShellBinaryPath(dirPath) {
  if (process.platform === 'linux') {
    return path.resolve(dirPath, 'content_shell');
  }

  if (process.platform === 'win32') {
    return path.resolve(dirPath, 'content_shell.exe');
  }

  if (process.platform === 'darwin') {
    return path.resolve(dirPath, 'Content Shell.app', 'Contents', 'MacOS', 'Content Shell');
  }
}

function runTests(buildDirectoryPath, useDebugDevtools) {
  const testArgs = getInspectorTests().concat([
    '--build-directory',
    buildDirectoryPath,
    '--target',
    TARGET,
  ]);
  if (useDebugDevtools) {
    testArgs.push('--additional-driver-flag=--debug-devtools');
  } else {
    console.log('TIP: You can debug a test using: npm run debug-test inspector/test-name.html');
  }

  if (IS_DEBUG_ENABLED) {
    testArgs.push('--additional-driver-flag=--remote-debugging-port=9222');
    testArgs.push('--time-out-ms=6000000');
    console.log('\n=============================================');
    const unitTest = testArgs.find(arg => arg.includes('http/tests/devtools/unit/'));
    if (unitTest) {
      const unitTestPath = `http://localhost:8080/${unitTest.slice('http/tests/'.length)}`;
      const link =
          `http://localhost:8080/inspector-sources/debug/integration_test_runner.html?test=${unitTestPath}`;
      console.log('1) Go to: ', link);
      console.log('2) Go to: http://localhost:9222/, click on "inspected-page.html", and copy the ws query parameter');
      console.log('3) Open DevTools on DevTools and you can refresh to re-run the test');
    } else {
      console.log('Go to: http://localhost:9222/');
      console.log('Click on link and in console execute: test()');
    }
    console.log('=============================================\n');
  }
  const args = [BLINK_TEST_PATH].concat(testArgs).concat(getTestFlags());
  console.log(`Running web tests with args: ${args.join(' ')}`);
  childProcess.spawn(PYTHON, args, {stdio: 'inherit'});
}

function getTestFlags() {
  const flagValues = Object.keys(Flags).map(key => Flags[key]);
  return process.argv.slice(2).filter(arg => {
    const flagName = utils.includes(arg, '=') ? arg.slice(0, arg.indexOf('=')) : arg;
    return !utils.includes(flagValues, flagName) && !utils.includes(arg, 'inspector') &&
        !utils.includes(arg, 'http/tests/devtools');
  });
}

function getInspectorTests() {
  const specificTests =
      process.argv.filter(arg => utils.includes(arg, 'inspector') || utils.includes(arg, 'http/tests/devtools'));
  if (specificTests.length) {
    return specificTests;
  }
  return [
    'inspector*',
    'http/tests/inspector*',
    'http/tests/devtools',
  ];
}
