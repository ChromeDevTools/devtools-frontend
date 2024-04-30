// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const {writeIfChanged} = require('../../../scripts/build/ninja/write-if-changed.js');
const [, , targetGenDir] = process.argv;

let value = 'false';

if (process.argv.includes('--should-enable')) {
  value = 'true';
}

writeIfChanged(path.join(targetGenDir, 'EasterEgg.js'), `export const SHOULD_SHOW_EASTER_EGG = ${value};`);
