// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

import {SOURCE_ROOT} from '../conductor/paths.js';
import {loadTests} from '../conductor/test_config.js';
import {run} from '../shared/run-mocha.js';

import devtoolsTestInterface from './conductor/mocha-interface.js';

void run({
  require: [
    path.join(path.dirname(__dirname), 'e2e', 'conductor', 'mocha_hooks.js'),
    path.join(SOURCE_ROOT, 'node_modules', 'source-map-support', 'register.js'),
  ],
  spec: loadTests(__dirname),
  timeout: 10_000,
  suiteName: 'e2e',
  ui: devtoolsTestInterface as unknown as 'bdd',
});
