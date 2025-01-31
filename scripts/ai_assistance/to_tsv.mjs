// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Converts a JSON results file into two TSV files: queries and responses.
// Usage: node to_tsv.mjs path/to/file.json

import assert from 'assert';
import fs from 'fs/promises';

const file = process.argv[2];

assert(file.endsWith('.json'));

const data = JSON.parse(await fs.readFile(file, 'utf-8'));

const responses = [];
const queries = [];

function formatRequest(request) {
  const lines = [
    ...(request.chat_history || []).map(item => item.text),
    request.input,
  ];
  return lines.join('\n\n===\n\n');
}

const escapeCell = val => `"${(String(val)).replaceAll('"', '""')}"`;

for (const example of data.examples) {
  responses.push(escapeCell(example.response));
  queries.push(escapeCell(formatRequest(example.request)));
}

assert(responses.length === queries.length);

await fs.writeFile(file.replace('.json', '-queries.tsv'), queries.join('\n'));
await fs.writeFile(file.replace('.json', '-responses.tsv'), responses.join('\n'));

