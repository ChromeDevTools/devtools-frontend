// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
const fs = require('fs');
const path = require('path');
const [, , src, dest] = process.argv;

const srcPath = path.join(process.cwd(), src);
const destPath = path.join(process.cwd(), dest);

// Force a write to the target filesystem, since by default the ninja
// toolchain will create a hardlink, which in turn reflects changes in
// gen and resources/inspector back to //front_end.
fs.writeFileSync(destPath, fs.readFileSync(srcPath, {encoding: 'utf8'}));
