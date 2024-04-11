// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as fs from 'fs';
import * as path from 'path';

import {ServerType, TestConfig} from '../conductor/test_config.js';

TestConfig.serverType = ServerType.ComponentDocs;

const spec = fs.readFileSync(path.join(__dirname, 'tests.txt'))
                 .toString()
                 .split('\n')
                 .map((t: string) => path.join(__dirname, t))
                 .filter((t: string) => TestConfig.tests.some((spec: string) => t.startsWith(spec)));

module.exports = {
  require : [path.join(path.dirname(__dirname), 'conductor', 'mocha_hooks.js'), 'source-map-support/register'], spec,
  timeout : TestConfig.debug ? 0 : 10_000,
  retries : 4,
  reporter : path.join(path.dirname(__dirname), 'shared', 'mocha-resultsdb-reporter'),
  suiteName : 'interactions',
  slow : 1000,
};
