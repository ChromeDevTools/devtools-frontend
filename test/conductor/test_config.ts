// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as path from 'path';

import {asArray, commandLineArgs, DiffBehaviors} from './commandline.js';
import {defaultChromePath, SOURCE_ROOT} from './paths.js';

const yargs = require('yargs');
const options = commandLineArgs(yargs(yargs.argv['_'])).argv;

export const enum ServerType {
  HOSTED_MODE = 'hosted-mode',
  COMPONENT_DOCS = 'component-docs',
}

interface Config {
  tests: string[];
  artifactsDir: string;
  chromeBinary: string;
  serverType: ServerType;
  debug: boolean;
  coverage: boolean;
  repetitions: number;
  onDiff: {update: boolean|string[], throw: boolean};
  shuffle: boolean;
  mochaGrep: {invert?: boolean, grep?: string}|{invert?: boolean, fgrep?: string};
  copyScreenshotGoldens: boolean;
}

function sliceArrayFromElement(array: string[], element: string) {
  const index = array.lastIndexOf(element);
  return index < 0 ? array : array.slice(index + 1);
}

const diffBehaviors = asArray(options['on-diff']);
// --diff=throw is the default, so set the option to true if there is either no --diff=no-throw or if it is overriden
// by a later --diff=throw
const onDiffThrow = !diffBehaviors.includes(DiffBehaviors.NO_THROW) ||
    sliceArrayFromElement(diffBehaviors, DiffBehaviors.NO_THROW).includes(DiffBehaviors.THROW);
// --diff=no-update overrules any previous --diff=update or --diff=update=X.
const onDiffUpdate =
    sliceArrayFromElement(diffBehaviors, DiffBehaviors.NO_UPDATE).filter(v => v.startsWith(DiffBehaviors.UPDATE));
// --diff=update overrules any previous --diff=update=X. Subsequent --diff=update=X overrule any previous --diff=update.
const diffUpdateFilters =
    sliceArrayFromElement(onDiffUpdate, DiffBehaviors.UPDATE).map(v => v.substr(v.indexOf('=') + 1));

const onDiffUpdateAll = onDiffUpdate.length > 0 && diffUpdateFilters.length === 0;
const onDiffUpdateSelected = onDiffUpdate.length > 0 ? diffUpdateFilters : false;

function mochaGrep(): Config['mochaGrep'] {
  if (!(options['grep'] ?? options['fgrep'])) {
    return {};
  }
  const isFixed = Boolean(options['fgrep']);
  const grep: Config['mochaGrep'] = isFixed ? {fgrep: options['fgrep']} : {grep: options['grep']};

  if (options['invert']) {
    grep.invert = true;
  }
  return grep;
}

function getTestsFromOptions() {
  const tests = options['tests'];
  if (Array.isArray(tests)) {
    return tests;
  }

  if (typeof tests === 'string') {
    return [tests];
  }
  return [];
}

export const TestConfig: Config = {
  tests: getTestsFromOptions(),
  artifactsDir: options['artifacts-dir'] || SOURCE_ROOT,
  chromeBinary: options['chrome-binary'] ?? defaultChromePath(),
  serverType: ServerType.HOSTED_MODE,
  debug: options['debug'],
  coverage: options['coverage'],
  repetitions: options['repeat'],
  onDiff: {
    update: onDiffUpdateAll || onDiffUpdateSelected,
    throw: onDiffThrow,
  },
  shuffle: options['shuffle'],
  mochaGrep: mochaGrep(),
  copyScreenshotGoldens: false,
};

export function loadTests(testDirectory: string) {
  const tests = fs.readFileSync(path.join(testDirectory, 'tests.txt'))
                    .toString()
                    .split('\n')
                    .map(t => t.trim())
                    .filter(t => t.length > 0)
                    .map(t => path.normalize(path.join(testDirectory, t)))
                    .filter(t => TestConfig.tests.some((spec: string) => t.startsWith(spec)));
  if (TestConfig.shuffle) {
    for (let i = tests.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tests[i], tests[j]] = [tests[j], tests[i]];
    }
  }
  return tests;
}
