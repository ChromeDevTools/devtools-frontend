// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const chokidar = require('chokidar');
const path = require('path');
const childProcess = require('child_process');
const cwd = process.cwd();
const env = process.env;
const frontEndDir = path.join(cwd, 'front_end');
const testsDir = path.join(cwd, 'test');

// Extract the target if it's provided.
let target = 'Default';
const targetArg = process.argv.find(value => value.startsWith('--target='));
if (targetArg) {
  target = targetArg.slice('--target='.length);
}

let restartBuild = false;
let autoninja;
const changedFiles = new Set();
const onFileChange = (_, fileName) => {
  // Some filesystems emit multiple events in quick succession for a
  // single file change. Here we track the changed files, and reset
  // after a short timeout.
  if (changedFiles.has(fileName)) {
    return;
  }
  changedFiles.add(fileName);
  setTimeout(() => {
    changedFiles.delete(fileName);
  }, 250);

  // If the exitCode is null, autoninja is still running so stop it
  // and try to restart it again.
  const ninjaProcessExists = Boolean(autoninja && autoninja.pid);
  if (ninjaProcessExists) {
    const isRunning = ninjaProcessExists && autoninja.exitCode === null;
    if (isRunning) {
      autoninja.kill();
      restartBuild = true;
    }
    return;
  }

  autoninja = childProcess.spawn('autoninja', ['-C', `out/${target}`], {cwd, env, stdio: 'inherit'});
  autoninja.on('close', () => {
    autoninja = null;
    if (restartBuild) {
      restartBuild = false;
      console.log(`\n${fileName} changed, restarting ninja\n`);
      onFileChange();
    }
  });
};

// Watch the front_end and test folder and build on any change.
console.log(`Watching for changes in ${frontEndDir} and ${testsDir}; building to out/${target}`);
chokidar.watch(frontEndDir).on('all', onFileChange);
chokidar.watch(testsDir).on('all', onFileChange);
