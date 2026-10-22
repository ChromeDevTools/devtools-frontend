// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'node:fs/promises';
import path from 'node:path';
import {parseArgs} from 'node:util';

import {writeIfChanged} from './ninja/write-if-changed.js';

const {values} = parseArgs({
  options: {
    template: {
      type: 'string',
    },
    'out-directory': {
      type: 'string',
    },
    entrypoints: {
      type: 'string',
      multiple: true,
    },
  },
  strict: true,
});

const {template, 'out-directory': outDirectory, entrypoints} = values;

if (!template || !outDirectory || !entrypoints || entrypoints.length === 0) {
  throw new Error(
      'Missing required arguments: --template, --out-directory, and --entrypoints must be provided',
  );
}

const templateContent = await fs.readFile(template, 'utf-8');

await Promise.all(entrypoints.map(async entrypoint => {
  const rewrittenTemplateContent = templateContent.replace(
      new RegExp('%ENTRYPOINT_NAME%', 'g'),
      entrypoint,
  );
  await writeIfChanged(
      path.join(outDirectory, `${entrypoint}.html`),
      rewrittenTemplateContent,
  );
}));
