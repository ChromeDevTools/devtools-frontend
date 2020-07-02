// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const cwd = process.cwd();
const env = process.env;
const frontEnd = path.join(cwd, 'front_end');

// Extract the target if it's provided.
let target = 'Default';
const targetArg = process.argv.find(value => value.startsWith('--target='));
if (targetArg) {
  target = targetArg.slice('--target='.length);
}

let isBuilding = false;
let filesChangedDuringBuild = false;
const onFileChange = () => {
  if (isBuilding) {
    filesChangedDuringBuild = true;
    return;
  }

  filesChangedDuringBuild = false;
  isBuilding = true;

  const autoninja = childProcess.spawn(
      'autoninja', ['-C', `out/${target}`, 'devtools_frontend_resources'], {cwd, env, stdio: 'inherit'});
  autoninja.on('close', () => {
    if (filesChangedDuringBuild) {
      console.warn('Warning: files changed during build, you may wish to trigger a fresh rebuild.');
    }

    isBuilding = false;
  });
};

// Watch the front_end folder and build on any change.
console.log(`Watching for changes in ${frontEnd}; building to out/${target}`);
fs.watch(`${frontEnd}`, {recursive: true}, onFileChange);
