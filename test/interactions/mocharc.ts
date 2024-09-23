// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'path';

import {loadTests, ServerType, TestConfig} from '../conductor/test_config.js';

TestConfig.serverType = ServerType.COMPONENT_DOCS;
TestConfig.copyScreenshotGoldens = true;

module.exports = {
  require : [path.join(path.dirname(__dirname), 'conductor', 'mocha_hooks.js'), 'source-map-support/register'],
  spec : loadTests(__dirname),
  timeout : TestConfig.debug ? 0 : 10_000,
  // Retry only on CI.
  retries : Boolean(process.env.LUCI_CONTEXT) ? 4 : 0,
  reporter : path.join(path.dirname(__dirname), 'shared', 'mocha-resultsdb-reporter'),
  suiteName : 'interactions',
  slow : 1000, ...TestConfig.mochaGrep,
};
