// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import {join} from 'path';

import {mkdirp} from '../shared/helper.js';

export const storeGeneratedResults = (file: string, content: string) => {
  const pathParts = ['..', 'perf', '.generated'];
  mkdirp(__dirname, pathParts);

  const path = join(__dirname, ...pathParts, file);
  fs.writeFileSync(path, content, {encoding: 'utf8'});
};
