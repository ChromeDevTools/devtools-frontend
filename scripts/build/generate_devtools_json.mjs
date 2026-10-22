// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { v5 } from 'uuid';

import { writeIfChanged } from './ninja/write-if-changed.js';

const { values } = parseArgs({
  options: {
    output: {
      type: 'string',
    },
  },
  strict: true,
});

const { output } = values;

if (!output) {
  throw new Error('Must specify --output location.');
}

const root = join(dirname(dirname(import.meta.dirname)), 'front_end');

// We use a pre-generated v4 UUID for the namespace
const NAMESPACE = '2ba62548-f4e9-11ef-9cd2-0242ac120002';

// Generate a v5 UUID with the root path as name.
const uuid = v5(root, NAMESPACE);

// Construct and write the `devtools.json`.
const devtools = {
  workspace: {
    root,
    uuid,
  },
};
await writeIfChanged(output, JSON.stringify(devtools, null, 2));
