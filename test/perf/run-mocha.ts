// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

import {SOURCE_ROOT} from '../conductor/paths.js';
import {loadTests, TestConfig} from '../conductor/test_config.js';
import devtoolsTestInterface from '../e2e/conductor/mocha-interface.js';
import {run} from '../shared/run-mocha.js';

TestConfig.isPerfTest = true;

void run({
  spec: [
    path.join(import.meta.dirname, 'setup', 'test_setup.js'),
    ...loadTests(import.meta.dirname),
  ],
  require: [
    path.join(path.dirname(import.meta.dirname), 'perf', 'setup', 'test_setup.js'),
    path.join(path.dirname(import.meta.dirname), 'e2e', 'conductor', 'mocha_hooks.js'),
    path.join(SOURCE_ROOT, 'node_modules', 'source-map-support', 'register.js'),
  ],
  timeout: 30_000,
  suiteName: 'perf',
  ui: devtoolsTestInterface as unknown as 'bdd',
});
