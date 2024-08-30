// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'path';

import {loadTests, TestConfig} from '../conductor/test_config.js';

const spec = loadTests(__dirname);
spec.unshift(path.join(__dirname, 'setup', 'test_setup.js'));

module.exports = {
  spec,
  require : [path.join(path.dirname(__dirname), 'conductor', 'mocha_hooks.js'), 'source-map-support/register'],
  timeout : TestConfig.debug ? 0 : 10_000,
  // Retry only on CI.
  retries : Boolean(process.env.LUCI_CONTEXT) ? 1 : 0,
  reporter : path.join(path.dirname(__dirname), 'shared', 'mocha-resultsdb-reporter'),
  suiteName : 'perf',
  slow : 1000, ...TestConfig.mochaGrep,
};
