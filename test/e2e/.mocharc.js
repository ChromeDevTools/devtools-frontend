// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const {getTestRunnerConfigSetting} = require('../../scripts/test/test_config_helpers.js');
const {createMochaConfig} = require('../base-mocharc.js');

// TODO (jacktfranklin): remove this once all scripts locally and all CQ bots use the new test runner and set --test-server-type=. crbug.com/1186163
const testServerConfig = getTestRunnerConfigSetting('test-server-type');
if (!testServerConfig) {
  process.env.TEST_SERVER_TYPE = 'hosted-mode';
}

module.exports = createMochaConfig({
  suiteName : 'e2e',
  extraMochaConfig : {
    // E2E tests are much slower by default than Mocha's 75ms default threshold.
    slow : 1000,
    // Maintaining pre-allocated frontend tabs in the background while also running
    // tests can cause very long running tests in some edge cases. We are more linient
    // in e2e tests.
    timeout : 10000,
    retries : 4,
  }
})
