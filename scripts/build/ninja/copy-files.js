// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import fs from 'node:fs/promises';
import path from 'node:path';

import {writeIfChanged} from './write-if-changed.js';

const [, , src, dest, files] = process.argv;

await Promise.all(files.split(',').map(async file => {
  const srcPath = path.join(src, file);
  const destPath = path.join(dest, file);

  const srcContents = await fs.readFile(srcPath);
  await writeIfChanged(destPath, srcContents);
}));
