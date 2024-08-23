// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function commandLineArgs(yargs: any) {
  return yargs.parserConfiguration({'camel-case-expansion': false})
      .command('$0 [tests..]')
      .option(
          'artifacts-dir',
          {type: 'string', desc: 'Path to a directory to store test artifacts in (e.g., coverage reports)'})
      .option('debug', {type: 'boolean', desc: 'Execute tests in debug mode'})
      .option('coverage', {type: 'boolean', desc: 'Enable coverage reporting'})
      .option('chrome-binary', {type: 'string', desc: 'Run tests with a custom chrome binary'})
      .option('repeat', {type: 'number', default: 1, desc: 'Repeat tests'})
      .option('on-diff', {
        type: 'string',
        coerce: validateDiffBehaviors,
        desc: `Define how to deal with diffs in snapshots/screenshots. Options are: ${
            Object.values(DiffBehaviors).join(', ')}`,
      })
      .option('shuffle', {type: 'boolean', desc: 'Execute tests in random order'})
      .option('grep', {type: 'string', conflicts: 'fgrep', desc: 'Filter tests by name using grep'})
      .option('fgrep', {type: 'string', conflicts: 'grep', desc: 'Filter tests by name using fgrep'})
      .option('invert-grep', {type: 'boolean', desc: 'Invert the grep/fgrep result'});
}
