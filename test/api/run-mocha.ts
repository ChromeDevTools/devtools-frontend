// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

import {GEN_DIR, SOURCE_ROOT} from '../conductor/paths.js';
import {loadTests} from '../conductor/test_config.js';
import {run} from '../shared/run-mocha.js';

import {devtoolsApiTestInterface} from './mocha-interface.js';

void run({
  require: [
    path.join(SOURCE_ROOT, 'node_modules', 'source-map-support', 'register.js'),
    path.join(GEN_DIR, 'test', 'api', 'mocha_hooks.js'),
  ],
  spec: loadTests(path.join(GEN_DIR, 'front_end'), 'api_tests.txt'),
  timeout: 10_000,
  suiteName: 'api',
  ui: devtoolsApiTestInterface as unknown as 'bdd',
});
