// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import fs from 'node:fs';
import path from 'node:path';

import {parseExpectations, serializeExpectations} from '../test/conductor/test_expectations_parser.js';

import {getFlakyClusters} from './fetch_luci_test_clusters.ts';

async function main(): Promise<void> {
  const expectationsPath = path.join(import.meta.dirname, '..', 'test', 'TestExpectations');
  const content = fs.readFileSync(expectationsPath, 'utf-8');

  const expectations = parseExpectations(content);

  console.log('Fetching LUCI Analysis clusters for the last 7 days...');
  const clusters = await getFlakyClusters(7);

  let modified = false;
  const newExpectations: typeof expectations = [];

  for (const exp of expectations) {
    // If it's a comment/empty, or not Flaky (needs both Failure and Pass)
    if (exp.isCommentOrEmpty || !exp.results?.includes('Failure') || !exp.results?.includes('Pass')) {
      newExpectations.push(exp);
      continue;
    }

    // It is a flaky test
    const testName = exp.testName;
    const isFlakyInLuci = clusters.some(c => (c.title || '').includes(testName));

    if (!isFlakyInLuci) {
      console.log(`Removing stable test from TestExpectations: ${testName}`);
      modified = true;
      // Skip adding this to newExpectations, which effectively deletes it
    } else {
      newExpectations.push(exp);
    }
  }

  if (modified) {
    const newContent = serializeExpectations(newExpectations);
    fs.writeFileSync(expectationsPath, newContent + '\n', 'utf-8');
    console.log('\nSuccessfully updated test/TestExpectations');
  } else {
    console.log('\nNo stable tests found. No changes made.');
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
