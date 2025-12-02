// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

import {writeIfChanged} from '../../../scripts/build/ninja/write-if-changed.js';

const [, , targetGenDir] = process.argv;

let value = 'false';

if (process.argv.includes('--should-enable')) {
  value = 'true';
}

writeIfChanged(
    path.join(targetGenDir, 'EasterEgg.js'),
    `export const SHOULD_SHOW_EASTER_EGG = ${value};`,
);
