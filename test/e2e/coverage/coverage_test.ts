// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describe, it} from '../../shared/mocha-extensions.js';

import {clearCoverageContent, navigateToCoverageTestSite, startInstrumentingCoverage, stopInstrumentingCoverage, waitForTheCoveragePanelToLoad} from '../helpers/coverage-helpers.js';

describe('The Coverage Panel', async () => {
  it('Loads correctly', async () => {
    await waitForTheCoveragePanelToLoad();
  });

  it('Can start and stop instrumenting coverage', async () => {
    await waitForTheCoveragePanelToLoad();
    await navigateToCoverageTestSite();
    await startInstrumentingCoverage();
    await stopInstrumentingCoverage();
    await clearCoverageContent();
  });
});
