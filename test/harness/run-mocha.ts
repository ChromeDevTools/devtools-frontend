// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

import {loadTests} from '../conductor/test_config.js';
import devtoolsTestInterface from '../e2e/conductor/mocha-interface.js';
import {run} from '../shared/run-mocha.js';

void run({
  require: [
    path.join(path.dirname(__dirname), 'e2e', 'conductor', 'mocha_hooks.js'),
    'source-map-support/register.js',
  ],
  spec: loadTests(__dirname, path.join('e2e', 'tests.txt')),
  timeout: 10_000,
  suiteName: 'e2e',
  ui: devtoolsTestInterface as unknown as 'bdd',
});
