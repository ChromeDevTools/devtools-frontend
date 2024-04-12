// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export enum DiffBehaviors {
  Update = 'update',
  Throw = 'throw',
  NoThrow = 'no-throw',
  NoUpdate = 'no-update',
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
    if (!arg.startsWith(`${DiffBehaviors.Update}=`)) {
      failed.push(arg);
    }
  }
  if (failed.length > 0) {
    throw new Error(`Invalid options for --on-diff: ${failed}`);
  }
  return asArray(args);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function commandLineArgs(yargs: any) {
  return yargs.parserConfiguration({'camel-case-expansion': false})
      .command('$0 [tests..]')
      .option('debug', {type: 'boolean'})
      .option('coverage', {type: 'boolean'})
      .option('chrome-binary', {type: 'string'})
      .option('repeat', {type: 'number', default: 1})
      .option('on-diff', {type: 'string', coerce: validateDiffBehaviors})
      .option('shuffle', {type: 'boolean'})
      .option('grep', {type: 'string', conflicts: 'fgrep'})
      .option('fgrep', {type: 'string', conflicts: 'grep'})
      .option('invert-grep', {type: 'boolean'});
}
