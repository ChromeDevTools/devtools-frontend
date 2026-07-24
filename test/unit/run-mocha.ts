// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'node:path';

import {GEN_DIR, SOURCE_ROOT} from '../../test/conductor/paths.js';
import {loadTests} from '../conductor/test_config.js';
import {run} from '../shared/run-mocha.js';

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
