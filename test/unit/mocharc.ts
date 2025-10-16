// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'node:path';

import {loadTests, TestConfig} from '../conductor/test_config.js';

module.exports = {
  // This should make mocha crash on uncaught errors.
  // See https://github.com/mochajs/mocha/blob/master/docs/index.md#--allow-uncaught.
  allowUncaught : true,
  require : ['source-map-support/register', 'chai/register-assert'],
  spec : loadTests(path.join(__dirname, '..', '..', 'front_end')),
  timeout : TestConfig.debug ? 0 : 10_000,
  reporter : path.join(path.dirname(__dirname), 'shared', 'mocha-resultsdb-reporter'),
  retries : TestConfig.retries,
  suiteName : 'unit',
  slow : 1000, ...TestConfig.mochaGrep,
};
