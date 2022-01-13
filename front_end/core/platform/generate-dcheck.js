// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const path = require('path');
const {writeIfChanged} = require('../../../scripts/build/ninja/write-if-changed.js');
const [, , targetGenDir] = process.argv;

let functionImplementation = '';

if (process.argv.includes('--should-dcheck')) {
  functionImplementation = `
  if (!condition()) {
    throw new Error(message + ':' + new Error().stack);
  }
`;
}

writeIfChanged(
    path.join(targetGenDir, 'dcheck.js'),
    `export function DCHECK(condition, message = 'DCHECK') {${functionImplementation}}`);
