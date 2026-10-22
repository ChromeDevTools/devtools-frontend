// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'node:fs';
import {parseArgs} from 'node:util';
import * as sourceMap from 'source-map';

const {values} = parseArgs({
  options: {
    input: {
      type: 'string',
    },
    offset: {
      type: 'string',
    },
  },
  strict: true,
});

if (!values.input || values.offset === undefined) {
  throw new Error('usage: wasm_sourcemap.mjs --input <input.map> --offset <offset>');
}

const offset = Number(values.offset || 0);
const sourceMapContents = JSON.parse(fs.readFileSync(values.input, 'utf-8'));
const sourceMapConsumer = new sourceMap.SourceMapConsumer(sourceMapContents);

const sourceMappings = [];
sourceMapConsumer.eachMapping(({source, generatedLine, generatedColumn, originalLine, originalColumn}) => {
  const bytecodeOffset = generatedColumn - offset;
  sourceMappings.push({source, generatedLine, generatedColumn, originalLine, originalColumn, bytecodeOffset});
});

console.log(JSON.stringify(sourceMappings));
