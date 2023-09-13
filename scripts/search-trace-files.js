// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * Finds trace files in fixtures/traces with references to the provided string.
 *
 * Usage:
 * node scripts/search-trace-files.js "v8.parse"
 */

const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const TRACE_FILES_DIR = path.join(__dirname, '..', 'test', 'unittests', 'fixtures', 'traces');

// Get a list of all trace files (gzipped or otherwise)
const filesInDir = fs.readdirSync(TRACE_FILES_DIR, 'utf8').filter(file => file.includes('.json'));

// A set of all the *.json files that we find.
const extractedFilePaths = new Set();

for (const fileNameWithExt of filesInDir) {
  // Get the name of the file with no extensions. /foo/bar/baz.json.gz => "baz"
  const fileName = path.basename(fileNameWithExt).split('.')[0];

  const fullPath = path.join(TRACE_FILES_DIR, `${fileName}.json.gz`);
  // If we found a .json.gz without a matching .json, extract the file.
  // traces/*.json are gitignored, so we can safely do this without risking
  // them being committed.
  if (!fs.existsSync(path.join(TRACE_FILES_DIR, `${fileName}.json`))) {
    console.log('[One time operation] Extracting gzip:', fileName);
    const result = child_process.spawnSync('gzip', ['--keep', '-d', `${fullPath}`]);
    if (result.status !== 0) {
      console.error(`Error extracting ${path.basename(fullPath)}: ${result.output}`);
    }
  }
  extractedFilePaths.add(path.join(TRACE_FILES_DIR, `${fileName}.json`));
}

const searchTerm = process.argv[2];
console.log('Searching for', `"${searchTerm}"`);

const matches = new Set();

Array.from(extractedFilePaths).forEach(fileToCheck => {
  if (!fs.existsSync(fileToCheck)) {
    return null;
  }
  // Yes, this is pretty inefficient to read the entire file sync, but this
  // is only a hacky helper script so it will do :)
  const contents = fs.readFileSync(fileToCheck, 'utf8');
  const hasMatch = contents.includes(searchTerm);
  if (hasMatch) {
    matches.add(fileToCheck);
  }
});

if (matches.size) {
  const matchesSorted = Array.from(matches).map(fullPath => path.relative(TRACE_FILES_DIR, fullPath)).sort();
  console.log('\n=> ' + matchesSorted.join('\n=> '));
} else {
  console.log('No matches found :(');
}
