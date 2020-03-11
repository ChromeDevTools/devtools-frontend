// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const shell = childProcess.execSync;

const utils = require('../utils');

const REMOTE_DEBUGGING_PORT = parseInt(process.env.REMOTE_DEBUGGING_PORT, 10) || 9222;
const SERVER_PORT = parseInt(process.env.PORT, 10) || 8090;
const CHROMIUM_DEFAULT_PATH = path.resolve(__dirname, '..', '..', 'third_party', 'chrome', 'chrome-linux', 'chrome');
const CHROME_PROFILE_PATH = path.resolve(__dirname, '..', '..', '.dev_profile');

const Flags = {
  RESET_PROFILE: '--reset-profile',
};

if (utils.includes(process.argv, Flags.RESET_PROFILE)) {
  console.log('Removing your dev profile for Chrome Canary / Chromium at:');
  console.log(CHROME_PROFILE_PATH, '\n');
  utils.removeRecursive(CHROME_PROFILE_PATH);
}

const chromeArgs = [
  `--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
  `--custom-devtools-frontend=http://localhost:${SERVER_PORT}/front_end/`, '--no-first-run',
  `http://localhost:${REMOTE_DEBUGGING_PORT}#custom=true`, 'https://devtools.chrome.com',
  `--user-data-dir=${CHROME_PROFILE_PATH}`
].concat(process.argv.slice(2));

if (process.platform === 'win32') {
  launchChromeWindows();
  return;
}
if (process.platform === 'darwin') {
  launchChromeMac();
  return;
}
if (process.platform === 'linux') {
  launchChromeLinux();
  return;
}

throw new Error(`Unrecognized platform detected: ${process.platform}`);

function launchChromeWindows() {
  let chromeCanaryPath;
  if (utils.isFile(process.env.CHROMIUM_PATH)) {
    chromeCanaryPath = process.env.CHROMIUM_PATH;
  } else {
    const suffix = '\\Google\\Chrome SxS\\Application\\chrome.exe';
    const prefixes = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']];
    for (let i = 0; i < prefixes.length; i++) {
      const prefix = prefixes[i];
      try {
        chromeCanaryPath = path.join(prefix, suffix);
        fs.accessSync(chromeCanaryPath);
        break;
      } catch (e) {
      }
    }
  }
  launchChrome(chromeCanaryPath, chromeArgs);
}

function launchChromeMac() {
  let chromeExecPath;
  if (utils.isFile(process.env.CHROMIUM_PATH)) {
    chromeExecPath = process.env.CHROMIUM_PATH;
  } else {
    const lsregister =
        '/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister';
    const chromeCanaryPath = shellOutput(
        `${lsregister} -dump | grep -i 'applications/google chrome canary.app$' | awk '{$1=""; print $0}' | head -n 1`);
    chromeExecPath = `${chromeCanaryPath}/Contents/MacOS/Google Chrome Canary`;
  }
  launchChrome(chromeExecPath, chromeArgs);
}

function launchChromeLinux() {
  let chromiumPath;
  if (utils.isFile(process.env.CHROMIUM_PATH)) {
    chromiumPath = process.env.CHROMIUM_PATH;
  } else if (utils.isFile(CHROMIUM_DEFAULT_PATH)) {
    chromiumPath = CHROMIUM_DEFAULT_PATH;
  } else {
    onLaunchChromeError();
    return;
  }
  launchChrome(chromiumPath, chromeArgs);
}

function launchChrome(filePath, chromeArgs) {
  console.log(`Launching Chrome from ${filePath}`);
  console.log('Chrome args:', chromeArgs.join(' '), '\n');
  let child;
  try {
    child = childProcess.spawn(filePath, chromeArgs, {
      stdio: 'inherit',
    });
  } catch (error) {
    onLaunchChromeError();
    return;
  }
  child.on('error', onLaunchChromeError);
  child.on('exit', onExit);
  function onExit(code) {
    console.log('Exited Chrome with code', code);
  }
}

function onLaunchChromeError() {
  if (process.platform !== 'linux') {
    console.log('ERROR: Cannot find Chrome Canary on your computer');
    console.log('Install Chome Canary at:');
    console.log('https://www.google.com/chrome/browser/canary.html\n');
  } else {
    console.log('ERROR: Could not launch Chromium');
    console.log('The environment variable CHROMIUM_PATH must be set to executable of a build of Chromium');
    console.log('If you do not have a recent build of chromium, you can get one from:');
    console.log('https://download-chromium.appspot.com/\n');
  }
}

function shellOutput(command) {
  return shell(command).toString().trim();
}
