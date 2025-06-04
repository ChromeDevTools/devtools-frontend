// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Yargs from 'yargs';

export enum DiffBehaviors {
  UPDATE = 'update',
  THROW = 'throw',
  NO_THROW = 'no-throw',
  NO_UPDATE = 'no-update',
}

export function asArray(value: undefined|string|string[]) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function validateDiffBehaviors(args: undefined|string|string[]) {
  const failed = [];
  for (const arg of asArray(args)) {
    if (Object.values(DiffBehaviors).includes(arg as DiffBehaviors)) {
      continue;
    }
    if (!arg.startsWith(`${DiffBehaviors.UPDATE}=`)) {
      failed.push(arg);
    }
  }
  if (failed.length > 0) {
    throw new Error(
        `Invalid options for --on-diff: ${failed}. Valid options are: ${Object.values(DiffBehaviors).join(', ')}`);
  }
  return asArray(args);
}

export function commandLineArgs<T = Record<string, unknown>>(yargs: Yargs.Argv<T>) {
  return yargs
      .parserConfiguration({
        'camel-case-expansion': false,
      })
      // TODO: add description
      .command('$0 [tests..]', '')
      .option('debug', {
        type: 'boolean',
        default: false,
        desc: 'Execute tests in debug mode',
      })
      .option('headless', {
        type: 'boolean',
        default: false,
        desc: 'Run tests headless even when in debug mode',
      })
      .option('coverage', {
        type: 'boolean',
        default: false,
        desc: 'Enable coverage reporting',
      })
      .option('artifacts-dir', {
        type: 'string',
        desc: 'Path to a directory to store test artifacts in (e.g. coverage reports)',
      })
      .option('chrome-binary', {
        type: 'string',
        desc: 'Path to a custom Chrome binary to run',
      })
      .option('on-diff', {
        type: 'string',
        coerce: validateDiffBehaviors,
        choices: Object.values(DiffBehaviors),
        desc: 'Define how to deal with diffs in snapshots/screenshots',
      })
      .option('shuffle', {
        type: 'boolean',
        desc: 'Execute tests in random order',
        default: false,
      })
      .option('repeat', {
        type: 'number',
        default: 1,
        desc: 'Reruns the test X number of times regardless of result (e2e tests only)',
      })
      .option('retries', {
        type: 'number',
        desc: 'Reruns the tests if upon failure at max X number of times',
        default: 0,
      })
      .option('grep', {
        type: 'string',
        conflicts: 'fgrep',
        desc: 'Filter tests by name using grep',
      })
      .option('fgrep', {
        type: 'string',
        conflicts: 'grep',
        desc: 'Filter tests by name using fgrep',
      })
      .option('invert-grep', {
        type: 'boolean',
        default: false,
        desc: 'Invert the grep/fgrep result',
      });
}
