// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable no-console */
// no-console disabled here as this is a test runner and expects to output to the console

import * as cluster from 'cluster';
import {getEnvVar} from './config.js';
import {color, TextColor} from './text-color.js';

const role = cluster.isMaster ? './master' : './worker';
const roleImpl = require(role);
roleImpl.init();

const envNoShuffle = getEnvVar('NO_SHUFFLE', false);
const testListPath = getEnvVar('TEST_LIST');
const envTestFile = getEnvVar('TEST_FILE');
const envDebug = getEnvVar('DEBUG', false);
const envStressTest = getEnvVar('STRESS', false);
let envIterations = getEnvVar('ITERATIONS', envStressTest ? 37 : 1);

if (!testListPath) {
  throw new Error('Must specify a list of tests in the "TEST_LIST" environment variable.');
}

function shuffleTestFiles(files: string[]) {
  if (envNoShuffle) {
    console.log('Running tests unshuffled');
    return files;
  }

  const swap = (arr: string[], a: number, b: number) => {
    const temp = arr[a];
    arr[a] = arr[b];
    arr[b] = temp;
  };

  for (let i = files.length; i >= 0; i--) {
    const a = Math.floor(Math.random() * files.length);
    const b = Math.floor(Math.random() * files.length);

    swap(files, a, b);
  }

  console.log(`Enqueuing tests in the following order:\n${files.join('\n')}`);
  return files;
}

async function runTests() {
  if (!cluster.isMaster) {
    return;
  }

  let {testList} = await import(testListPath!);
  if (envTestFile) {
    testList = testList.filter((testFile: string) => testFile === envTestFile);
  }

  const shuffledTests = shuffleTestFiles(testList);

  if (envIterations > 1) {
    console.log(`${color('Iterations:', TextColor.MAGENTA)} ${envIterations}`);
  }

  do {
    if (envDebug) {
      logHelp();
      await waitForInput();
    }

    roleImpl.enqueue(shuffledTests);
  } while (envDebug || --envIterations > 0);
}

function logHelp() {
  console.log(color('Running in debug mode.', TextColor.MAGENTA));
  console.log(color(' - Press any key to run the test suite.', TextColor.MAGENTA));
  console.log(color(' - Press ctrl + c to quit.', TextColor.MAGENTA));
}

async function waitForInput() {
  return new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', async str => {
      // Listen for ctrl+c to exit.
      if (str.toString() === '\x03') {
        roleImpl.interruptionHandler();
      }
      resolve();
    });
  });
}

runTests();
