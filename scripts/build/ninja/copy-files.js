// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';

import {writeIfChanged} from './write-if-changed.js';

const {values} = parseArgs({
  options: {
    src: {
      type: 'string',
    },
    dest: {
      type: 'string',
    },
    files: {
      type: 'string',
    },
  },
  strict: true,
});

const {src, dest, files} = values;

if (!src || !dest || !files) {
  throw new Error('Missing required arguments: --src, --dest, and --files must be provided');
}

await Promise.all(files.split(',').map(async file => {
  const srcPath = path.join(src, file);
  const destPath = path.join(dest, file);

  const srcContents = await fs.readFile(srcPath);
  await writeIfChanged(destPath, srcContents);
}));
