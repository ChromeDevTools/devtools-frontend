// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const fs = require('fs');
const path = require('path');

const utils = require('../utils');

const TESTS_PATH = path.resolve(__dirname, 'tests.txt');

function main() {
  const files = process.argv.slice(2);
  const inputPaths = files.map(p => path.isAbsolute(p) ? p : path.resolve(process.cwd(), p));
  let globbedPaths = [];
  for (const p of inputPaths) {
    glob(p);
  }
  let contents = fs.readFileSync(TESTS_PATH, 'utf-8');
  const tests = new Set(contents.split('\n').map(l => l.split(' ')[0]));
  for (const p of globbedPaths) {
    const relativePath = p.slice(p.indexOf('LayoutTests') + 'LayoutTests'.length + 1);
    if (!tests.has(relativePath))
      contents += relativePath + '\n'
  }
  console.log('contents', contents);
  fs.writeFileSync(TESTS_PATH, contents, 'utf-8');


  function glob(globPath) {
    for (const filename of fs.readdirSync(globPath)) {
      const p = path.resolve(globPath, filename);
      if (utils.isDir(p) && filename !== 'resources') {
        glob(p);
      }
      if (utils.isFile(p) && p.endsWith('.html')) {
        globbedPaths.push(p);
      }
    }
  }
}

main();
