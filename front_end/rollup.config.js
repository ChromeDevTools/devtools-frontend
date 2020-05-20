// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as path from 'path';

import {terser} from 'rollup-plugin-terser';

const external = fs.readdirSync(__dirname, {withFileTypes: true})
                     .filter(dirent => dirent.isDirectory())
                     .map(dirent => path.join(__dirname, dirent.name, dirent.name + '.js'));

// eslint-disable-next-line import/no-default-export
export default {
  external,
  treeshake: false,
  context: 'self',
  output: {
    format: 'esm',
    plugins: [terser()],
  },
};
