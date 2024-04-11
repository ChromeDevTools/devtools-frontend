// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as os from 'os';
import * as path from 'path';

import {SOURCE_ROOT} from './paths.js';

export enum DiffBehaviors {
  Update = 'update',
  Throw = 'throw',
  NoThrow = 'no-throw',
  NoUpdate = 'no-update',
}

const yargs = require('yargs');
const options = commandLineArgs(yargs(yargs.argv['_'])).argv;

function asArray(value: undefined|string|string[]) {
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
      .strict();
}

function chromePath() {
  const paths = {
    'linux': path.join('chrome-linux', 'chrome'),
    'darwin':
        path.join('chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    'win32': path.join('chrome-win', 'chrome.exe'),
  };
  return path.join(SOURCE_ROOT, 'third_party', 'chrome', paths[os.platform() as 'linux' | 'win32' | 'darwin']);
}

export const enum ServerType {
  HostedMode = 'hosted-mode',
  ComponentDocs = 'component-docs',
}

interface Config {
  tests: string[];
  chromeBinary: string;
  serverType: ServerType;
  debug: boolean;
  coverage: boolean;
  repetitions: number;
  onDiff: {update: boolean|string[], throw: boolean};
}

function sliceArrayFromElement(array: string[], element: string) {
  const index = array.lastIndexOf(element);
  return index < 0 ? array : array.slice(index + 1);
}

const diffBehaviors = asArray(options['on-diff']);
// --diff=throw is the default, so set the option to true if there is either no --diff=no-throw or if it is overriden
// by a later --diff=throw
const onDiffThrow = !diffBehaviors.includes(DiffBehaviors.NoThrow) ||
    sliceArrayFromElement(diffBehaviors, DiffBehaviors.NoThrow).includes(DiffBehaviors.Throw);
// --diff=no-update overrules any previous --diff=update or --diff=update=X.
const onDiffUpdate =
    sliceArrayFromElement(diffBehaviors, DiffBehaviors.NoUpdate).filter(v => v.startsWith(DiffBehaviors.Update));
// --diff=update overrules any previous --diff=update=X. Subsequent --diff=update=X overrule any previous --diff=update.
const diffUpdateFilters =
    sliceArrayFromElement(onDiffUpdate, DiffBehaviors.Update).map(v => v.substr(v.indexOf('=') + 1));

const onDiffUpdateAll = onDiffUpdate.length > 0 && diffUpdateFilters.length === 0;
const onDiffUpdateSelected = onDiffUpdate.length > 0 ? diffUpdateFilters : false;

export const TestConfig: Config = {
  tests: options['tests'],
  chromeBinary: options['chrome-binary'] ?? chromePath(),
  serverType: ServerType.HostedMode,
  debug: options['debug'],
  coverage: options['coverage'],
  repetitions: options['repeat'],
  onDiff: {
    update: onDiffUpdateAll || onDiffUpdateSelected,
    throw: onDiffThrow,
  },
};
