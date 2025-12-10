/**
 * @license
 * Copyright 2025 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @file A tiny wrapper around the Chromium bisect script
 * that runs Puppeteer tests
 * It's recommended to add .only to the failing test so
 * the script runs quicker.
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const { chromium, good, bad, test, dry } = await yargs(hideBin(process.argv))
  .parserConfiguration({
    'populate--': true,
  })
  .options('chromium', {
    type: 'string',
    default: path.join(os.homedir(), 'chromium', 'src'),
    alias: 'c',
    desc: 'Path to chromium download',
  })
  .option('good', {
    type: 'string',
    alias: 'g',
    demandOption: true,
    desc: 'Last known good version',
  })
  .option('bad', {
    type: 'string',
    alias: 'b',
    demandOption: true,
    desc: 'First known bad version',
  })
  .option('test', {
    type: 'string',
    alias: 't',
    desc: 'Test file to run. If omitted run all e2e tests.',
  })
  .option('dry', {
    type: 'boolean',
    alias: 'd',
    desc: 'Prints the command to console rather then running it.',
  })
  .version(false)
  .help(
    'help',
    'https://www.chromium.org/developers/bisect-builds-py/ \nWrapper script around the above chromium one to runs DevTools tests.',
  )
  .parse();

const pythonExecutable = 'python3';
const bisectScript = path.join(chromium, 'tools', 'bisect-builds.py');

const args = [
  bisectScript,
  '-g',
  good,
  '-b',
  bad,
  '-cft',
  '-v',
  '--verify-range',
  '--not-interactive',
  '-c',
  `"npm run test -- ${test} --chrome-binary=%p"`,
];

if (dry) {
  console.log([pythonExecutable, ...args].join(' '));
  process.exit(0);
}

await new Promise((resolve, reject) => {
  const createProcess = spawn(pythonExecutable, args, {
    shell: true,
    stdio: 'inherit',
  });

  createProcess.on('error', message => {
    reject(message);
  });

  createProcess.on('exit', () => {
    resolve(undefined);
  });
});
