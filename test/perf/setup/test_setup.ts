// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {clearResults, collectMeasurements, writeReport} from '../report/report.js';

export async function mochaGlobalTeardown(this: Mocha.Suite) {
  collectMeasurements();
  writeReport();
}

export async function mochaGlobalSetup(this: Mocha.Suite) {
  clearResults();
}
