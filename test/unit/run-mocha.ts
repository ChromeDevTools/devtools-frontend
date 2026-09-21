// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'node:path';

import {GEN_DIR, SOURCE_ROOT} from '../../test/conductor/paths.js';
import {loadTests, TestConfig} from '../conductor/test_config.js';
import {run} from '../shared/run-mocha.js';

if (TestConfig.tests.length === 0) {
  TestConfig.tests.push(
      path.join(GEN_DIR, 'front_end'),
      path.join(GEN_DIR, 'mcp'),
      path.join(GEN_DIR, 'test', 'harness', 'unit'),
  );
}

void run({
  require: [
    path.join(SOURCE_ROOT, 'node_modules', 'source-map-support', 'register.js'),
    path.join(GEN_DIR, 'test', 'unit', 'mocha-hooks.js'),
  ],
  spec: [
    ...loadTests(path.join(GEN_DIR, 'front_end'), 'foundation_tests.txt'),
    ...loadTests(path.join(GEN_DIR, 'mcp'), 'foundation_tests.txt'),
    ...loadTests(
        path.join(GEN_DIR, 'test', 'harness', 'unit'),
        'foundation_tests.txt',
        ),
  ],
  timeout: 10_000,
  suiteName: 'unit',
});
