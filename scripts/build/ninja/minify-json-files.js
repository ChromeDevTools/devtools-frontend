// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'node:fs/promises';
import path from 'node:path';

import {writeIfChanged} from './write-if-changed.js';

const [, , dest, ...files] = process.argv;

await Promise.all(files.map(async file => {
  const filename = path.basename(file);
  const destPath = path.join(dest, filename);

  // Minifying JSON is straight-forward as JSON.stringify omits whitespace.
  const srcContents = await fs.readFile(file, 'utf-8');
  const destContents = JSON.stringify(JSON.parse(srcContents));
  await writeIfChanged(destPath, destContents);
}));
