#!/usr/bin/env node

// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const path = require('path');
const fs = require('fs');

const {
  devtoolsRootPath,
} = require('./devtools_paths.js');

function bail(message) {
  console.error(message);
  process.exit(1);
}

function findVersionFromDepsFile() {
  const filePath = path.join(devtoolsRootPath(), 'DEPS');
  const contents = fs.readFileSync(filePath, 'utf8').split('\n');
  const esbuildPackageLine = contents.findIndex(line => line.match(/infra\/3pp\/tools\/esbuild/));
  if (esbuildPackageLine === -1) {
    bail('Could not find ESBuild within DEPS file.');
  }
  const esbuildVersionLine = contents[esbuildPackageLine + 1];
  const result = /@(\d{1,2}\.\d{1,2}\.\d{1,2})/.exec(esbuildVersionLine)?.[1];
  if (!result) {
    bail('Could not parse out ESBuild version from DEPS');
  }
  return result;
}

function findVersionFromPackageJsonFile() {
  const filePath = path.join(devtoolsRootPath(), 'package.json');
  const contents = fs.readFileSync(filePath, 'utf8');
  const result = /"esbuild": "([0-9\.]+)"/.exec(contents)?.[1];
  if (!result) {
    bail('Could not parse out ESBuild version from package.json');
  }
  return result;
}

const nodeDepsVersion = findVersionFromPackageJsonFile();
const depsVersion = findVersionFromDepsFile();
if (nodeDepsVersion !== depsVersion) {
  bail(`Found mismatching esbuild versions in DEPS vs package.json:
    package.json:   ${nodeDepsVersion}
    DEPS:           ${depsVersion}\n`);
}
