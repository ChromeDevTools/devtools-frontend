// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file This script provides automatic bisecting between
 * test file in cases where file A makes B fail due to improper
 * clean up.
 */
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

const options =
    yargs(hideBin(process.argv))
        .option('verbose', {
          type: 'boolean',
          default: false,
          alias: 'v',
        })
        .option('dumpOutput', {
          type: 'boolean',
          default: false,
          description: 'Dumps the test command output to std',
        })
        .option('test', {
          type: 'string',
          demandOption: true,
          desc: 'The failing test that we want to find the culprit for.',
          alias: 't',
        })
        .option('folder', {
          type: 'string',
          description: 'Folder to start the bisect from. Default to `front_end/` for unit test and `test/` for e2e',
          alias: 'f',
        })
        .option('fileExtension', {
          type: 'string',
          description: 'The extension for testing. Defaults to `.test.ts` for front_end and `_test.ts` for E2E.',
          alias: 'e'
        })
        .check(args => {
          if (!args.folder) {
            if (args.test.includes('front_end')) {
              args.folder = 'front_end/';
            } else {
              args.folder = 'test/';
            }
          }
          if (args.folder.includes('front_end')) {
            args.fileExtension = '.test.ts';
          } else {
            args.fileExtension = '_test.ts';
          }

          return true;
        })
        .parseSync();

function debugLog(...args: any[]) {
  if (options.verbose) {
    console.log(...args);
  }
}

function findAndSortTests(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAndSortTests(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(options.fileExtension ?? '<unknown>')) {
      files.push(fullPath);
    }
  }

  // Sort files alphabetically
  return files.sort();
}

function runTestCommand(files: string[]): boolean {
  const command = `npm run test -- ${files.join(' ')}`;
  if (options.dumpOutput) {
    debugLog('Executing command:\n', command);
  }
  try {
    child_process.execSync(command, {
      stdio: options.dumpOutput ? 'inherit' : 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

const testFiles = options.folder ? findAndSortTests(options.folder) : [];
if (testFiles.length <= 1) {
  throw new Error('No test files found to bisect against.');
} else if (testFiles.length === 2) {
  throw new Error(
      `Only two files found. Error should be in:\n${testFiles.filter(t => !t.endsWith(options.test)).join('\n')}`);
}

// Ensure we skip all the test after the failing test
const failingTestIndex = testFiles.findIndex(p => p.endsWith(options.test));
if (failingTestIndex === -1) {
  throw new Error(`Failing test not found in the current selected folder.`);
}

let low = 0;
let high = failingTestIndex - 1;
let culpritIndex = -1;

while (low < high) {
  const mid = Math.floor((low + high) / 2);

  const testToRun = [
    // Slice is excluding the element in end so we need to add +1
    ...testFiles.slice(low, mid + 1),
    // We need to explicitly add the failing test to ensure it runs.
    testFiles[failingTestIndex],
  ];

  console.log('');
  console.log(`Testing from ${testFiles[low]} to ${testFiles[mid]} (average step remaining ${
      Math.ceil(Math.log2(high - low + 1))})`);

  const success = runTestCommand(testToRun);

  if (success) {
    debugLog(`Culprit is *after* ${testFiles[mid]}.`);
    low = mid + 1;
  } else {
    debugLog(`Culprit is at or *before* ${testFiles[mid]}.`);
    culpritIndex = mid;
    high = mid;
  }
}

if (culpritIndex === -1) {
  console.log('No culprit found for bisection');
  process.exit();
}

console.log();
console.log('--- Suspected culprit found ---');
console.log(testFiles[culpritIndex]);
