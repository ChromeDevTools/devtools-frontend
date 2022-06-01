// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as sourceMap from 'source-map';

if (process.argv.length !== 4) {
  throw new Error(`usage: ${process.argv[1]} <input.map> <offset>`);
}

const offset = Number(process.argv[3] || 0);
const sourceMapContents = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
const sourceMapConsumer = new sourceMap.SourceMapConsumer(sourceMapContents);

const sourceMappings = [];
sourceMapConsumer.eachMapping(({source, generatedLine, generatedColumn, originalLine, originalColumn}) => {
  const bytecodeOffset = generatedColumn - offset;
  sourceMappings.push({source, generatedLine, generatedColumn, originalLine, originalColumn, bytecodeOffset});
});

console.log(JSON.stringify(sourceMappings));
