// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import {join} from 'path';

export const storeGeneratedResults = (file: string, content: string) => {
  const directory = join(__dirname, '../perf/.generated');
  fs.mkdirSync(directory, {recursive: true});

  const filePath = join(directory, file);
  fs.writeFileSync(filePath, content, {encoding: 'utf8'});
};
