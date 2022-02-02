// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');
const {writeIfChanged} = require('./write-if-changed.js');

const [, , src, dest, files] = process.argv;

for (const file of files.split(',')) {
  const srcPath = path.join(src, file);
  const destPath = path.join(dest, file);

  // Minifying JSON is straight-forward as JSON.stringify omits whitespace.
  const srcContents = fs.readFileSync(srcPath);
  const destContents = JSON.stringify(JSON.parse(srcContents));
  writeIfChanged(destPath, destContents);
}
