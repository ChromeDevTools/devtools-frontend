// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const shell = require('child_process').execSync;
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
const IS_FETCH_CONTENT_SHELL = utils.includes(process.argv, Flags.FETCH_CONTENT_SHELL);
const TARGET = utils.parseArgs(process.argv)[Flags.TARGET] || 'Release';

const CONTENT_SHELL_ZIP = 'content-shell.zip';
const MAX_CONTENT_SHELLS = 10;
const PLATFORM = getPlatform();
const PYTHON = process.platform === 'win32' ? 'python.bat' : 'python';

const CURRENT_PATH = process.env.PWD || process.cwd();  // Using env.PWD to account for symlinks.
const isThirdParty = CURRENT_PATH.includes('third_party');
const CHROMIUM_SRC_PATH = CUSTOM_CHROMIUM_PATH || getChromiumSrcPath(isThirdParty);
const RELEASE_PATH = path.resolve(CHROMIUM_SRC_PATH, 'out', TARGET);
const BLINK_TEST_PATH = path.resolve(CHROMIUM_SRC_PATH, 'third_party', 'blink', 'tools', 'run_web_tests.py');
const DEVTOOLS_PATH = path.resolve(CHROMIUM_SRC_PATH, 'third_party', 'devtools-frontend', 'src');
const CACHE_PATH = path.resolve(DEVTOOLS_PATH, '.test_cache');
const SOURCE_PATH = path.resolve(DEVTOOLS_PATH, 'front_end');

function main() {
  if (!utils.isDir(CACHE_PATH)) {
    fs.mkdirSync(CACHE_PATH);
  }
  deleteOldContentShells();

  const hasUserCompiledContentShell = utils.isFile(getContentShellBinaryPath(RELEASE_PATH));
  if (!IS_FETCH_CONTENT_SHELL && hasUserCompiledContentShell) {
    const outDir = path.resolve(RELEASE_PATH, '..');
    if (!IS_DEBUG_ENABLED) {
      compileFrontend();
    }

    runTests(outDir, IS_DEBUG_ENABLED);
    return;
  }

  findPreviousUploadedPosition(findMostRecentChromiumCommit())
    .then(onUploadedCommitPosition)
    .catch(onError);

  function onError(error) {
    console.log('Unable to run tests because of error:', error);
    console.log(`Try removing the .test_cache folder [${CACHE_PATH}] and retrying`);
  }
}
main();

function compileFrontend() {
  console.log('Compiling devtools frontend');
  try {
    shell(`ninja -C ${RELEASE_PATH} devtools_frontend_resources`, {cwd: CHROMIUM_SRC_PATH});
  } catch (err) {
    console.log(err.stdout.toString());
    console.log('ERROR: Cannot compile frontend\n' + err);
    process.exit(1);
  }
}

function onUploadedCommitPosition(commitPosition) {
  const contentShellDirPath = path.resolve(CACHE_PATH, commitPosition, 'out', TARGET);
  const contentShellResourcesPath = path.resolve(contentShellDirPath, 'resources');
  const contentShellPath = path.resolve(CACHE_PATH, commitPosition, 'out');

  const hasCachedContentShell = utils.isFile(getContentShellBinaryPath(contentShellDirPath));
  if (hasCachedContentShell) {
    console.log(`Using cached content shell at: ${contentShellPath}`);
    copyFrontend(contentShellResourcesPath);
    return runTests(contentShellPath, true);
  }
  const url = `http://commondatastorage.googleapis.com/chromium-browser-snapshots/${PLATFORM}/${commitPosition
  }/${CONTENT_SHELL_ZIP}`;
  return prepareContentShellDirectory(commitPosition)
      .then(() => downloadContentShell(url, commitPosition))
      .then(extractContentShell)
      .then(() => copyFrontend(contentShellResourcesPath))
      .then(() => runTests(contentShellPath, true));
}

function copyFrontend(contentShellResourcesPath) {
  const devtoolsResourcesPath = path.resolve(contentShellResourcesPath, 'inspector');
  const copiedFrontendPath = path.resolve(devtoolsResourcesPath, 'front_end');
  const debugFrontendPath = path.resolve(devtoolsResourcesPath, 'debug');
  utils.removeRecursive(copiedFrontendPath);
  utils.removeRecursive(debugFrontendPath);
  utils.copyRecursive(SOURCE_PATH, devtoolsResourcesPath);
  fs.renameSync(copiedFrontendPath, debugFrontendPath);
}

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

function getPlatform() {
  if (process.platform === 'linux') {
    return 'Linux_x64';
  }
  if (process.platform === 'win32') {
    return 'Win_x64';
  }
  if (process.platform === 'darwin') {
    return 'Mac';
  }

  throw new Error(`Unrecognized platform detected: ${process.platform}`);
}

function findMostRecentChromiumCommit() {
  const commitMessage = shell('git log --max-count=1 --grep="Cr-Commit-Position"').toString().trim();
  const commitPosition = commitMessage.match(/Cr-Commit-Position: refs\/heads\/master@\{#([0-9]+)\}/)[1];
  return commitPosition;
}

function deleteOldContentShells() {
  const files = fs.readdirSync(CACHE_PATH);
  if (files.length < MAX_CONTENT_SHELLS) {
    return;
  }
  files.sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  const remainingNumberOfContentShells = MAX_CONTENT_SHELLS / 2;
  const oldContentShellDirs = files.slice(remainingNumberOfContentShells);
  for (let i = 0; i < oldContentShellDirs.length; i++) {
    utils.removeRecursive(path.resolve(CACHE_PATH, oldContentShellDirs[i]));
  }
  console.log(`Removed old content shells: ${oldContentShellDirs}`);
}

function findPreviousUploadedPosition(commitPosition) {
  const previousPosition = commitPosition - 100;
  const positionsListURL =
      `http://commondatastorage.googleapis.com/chromium-browser-snapshots/?delimiter=/&prefix=${PLATFORM
  }/&marker=${PLATFORM}/${previousPosition}/`;
  return utils.fetch(positionsListURL).then(onPositionsList).catch(onError);

  function onPositionsList(buffer) {
    const positions = buffer.toString('binary')
                        .match(/([^<>]+)(?=<\/Prefix><\/CommonPrefixes>)/g)
                        .map(prefixedPosition => prefixedPosition.split('/')[1])
                        .map(positionString => parseInt(positionString, 10));
    const positionSet = new Set(positions);
    let previousUploadedPosition = commitPosition;
    while (commitPosition - previousUploadedPosition < 100) {
      if (positionSet.has(previousUploadedPosition)) {
        return previousUploadedPosition.toString();
      }
      previousUploadedPosition--;
    }
    onError();
  }

  function onError(error) {
    if (error) {
      console.log(`Received error: ${error} trying to fetch positions list from url: ${positionsListURL}`);
    }
    throw new Error(`Unable to find a previous upload position for commit position: ${commitPosition}`);
  }
}

async function prepareContentShellDirectory(folder) {
  const contentShellPath = path.join(CACHE_PATH, folder);
  if (utils.isDir(contentShellPath)) {
    utils.removeRecursive(contentShellPath);
  }
  fs.mkdirSync(contentShellPath);
  return folder;
}

function downloadContentShell(url, folder) {
  console.log('Downloading content shell from:', url);
  console.log('NOTE: Download is ~35-65 MB depending on OS');
  return utils.fetch(url).then(writeZip).catch(onError);

  function writeZip(buffer) {
    console.log('Completed download of content shell');
    const contentShellZipPath = path.join(CACHE_PATH, folder, CONTENT_SHELL_ZIP);
    fs.writeFileSync(contentShellZipPath, buffer);
    return contentShellZipPath;
  }

  function onError(error) {
    console.log(`Received error: ${error} trying to download content shell from url: ${url}`);
    throw new Error('Unable to download content shell');
  }
}

function extractContentShell(contentShellZipPath) {
  console.log(`Extracting content shell zip: ${contentShellZipPath}`);
  const unzipScriptPath = path.resolve(__dirname, 'unzip.py');
  const src = contentShellZipPath;
  const dest = path.resolve(path.dirname(src), 'out');
  shell(`${PYTHON} ${unzipScriptPath} ${src} ${dest}`);
  fs.unlinkSync(src);
  const originalDirPath = path.resolve(dest, 'content-shell');
  const newDirPath = path.resolve(dest, TARGET);
  fs.renameSync(originalDirPath, newDirPath);
  fs.chmodSync(getContentShellBinaryPath(newDirPath), '755');
  if (process.platform === 'darwin') {
    const helperPath = path.resolve(
        newDirPath, 'Content Shell.app', 'Contents', 'Frameworks', 'Content Shell Helper.app', 'Contents', 'MacOS',
        'Content Shell Helper');
    fs.chmodSync(helperPath, '755');
  }
  return dest;
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
