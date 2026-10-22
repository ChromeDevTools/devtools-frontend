// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';

import {writeIfChanged} from './write-if-changed.js';

const {values} = parseArgs({
  options: {
    dest: {
      type: 'string',
    },
    files: {
      type: 'string',
      multiple: true,
    },
  },
  strict: true,
});

const {dest, files} = values;

if (!dest || !files || files.length === 0) {
  throw new Error('Missing required arguments: --dest and --files must be provided');
}

await Promise.all(files.map(async file => {
  const filename = path.basename(file);
  const destPath = path.join(dest, filename);

  // Minifying JSON is straight-forward as JSON.stringify omits whitespace.
  const srcContents = await fs.readFile(file, 'utf-8');
  const destContents = JSON.stringify(JSON.parse(srcContents));
  await writeIfChanged(destPath, destContents);
}));
