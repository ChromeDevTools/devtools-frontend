// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const fs = require('fs');
const path = require('path');
const {writeIfChanged} = require('./write-if-changed.js');

const [, , dest, ...files] = process.argv;

for (const file of files) {
  const filename = path.basename(file);
  const destPath = path.join(dest, filename);

  // Minifying JSON is straight-forward as JSON.stringify omits whitespace.
  const srcContents = fs.readFileSync(file);
  const destContents = JSON.stringify(JSON.parse(srcContents));
  writeIfChanged(destPath, destContents);
}
