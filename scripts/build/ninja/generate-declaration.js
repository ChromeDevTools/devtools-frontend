// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import fs from 'node:fs';
import path from 'node:path';

import {writeIfChanged} from './write-if-changed.js';

const [, , outputDirectory, entrypointName] = process.argv;

const rawFileName = path.basename(entrypointName, path.extname(entrypointName));
const inputLocation = path.join(
    outputDirectory,
    `${rawFileName}.prebundle.d.ts`,
);
const outputLocation = path.join(outputDirectory, `${rawFileName}.d.ts`);

function toTscPath(p) {
  const parts = path.normalize(p).split(path.sep);
  const genIndex = parts.lastIndexOf('gen');
  if (genIndex !== -1) {
    parts[genIndex] = 'tsc';
    return parts.join(path.sep);
  }
  return p;
}

// We can't use copy here, as that would maintain the original file timestamps.
// This can throw off Ninja, which verifies that timestamps of generated files
// are the same as the timestamp it ran the action on.
const contents = fs.readFileSync(inputLocation);
writeIfChanged(outputLocation, contents);

const tscLocation = toTscPath(outputLocation);
if (tscLocation !== outputLocation) {
  const tscDir = path.dirname(tscLocation);
  if (!fs.existsSync(tscDir)) {
    fs.mkdirSync(tscDir, {recursive: true});
  }
  writeIfChanged(tscLocation, contents);
}
