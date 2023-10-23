// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getBrowserAndPages,
  getTestServerPort,
  goToResource,
  waitForElementWithTextContent,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  clearCoverageContent,
  getCoverageData,
  navigateToCoverageTestSite,
  startInstrumentingCoverage,
  stopInstrumentingCoverage,
  waitForTheCoveragePanelToLoad,
} from '../helpers/coverage-helpers.js';

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

  it('Shows coverage data on page loads if the instrumentation has started', async () => {
    await waitForTheCoveragePanelToLoad();
    await startInstrumentingCoverage();
    await navigateToCoverageTestSite();
    const URL_PREFIX = `https://localhost:${getTestServerPort()}/test/e2e/resources/coverage`;
    assert.deepEqual(await getCoverageData(2), [
      {
        'total': '193',
        'unused': '35',
        'url': `${URL_PREFIX}/default.html`,
      },
      {
        'total': '43',
        'unused': '31',
        'url': `${URL_PREFIX}/script.js`,
      },
    ]);
  });

  // Skip until flake is fixed
  it.skip('[crbug.com/1432922]: Shows completly uncovered css files', async () => {
    const {target} = getBrowserAndPages();

    await goToResource('coverage/unused-css-coverage.html');
    await waitForTheCoveragePanelToLoad();
    await startInstrumentingCoverage();
    const URL_PREFIX = `https://localhost:${getTestServerPort()}/test/e2e/resources/coverage`;
    assert.deepEqual(await getCoverageData(5), [
      {
        'total': '283',
        'unused': '276',
        'url': `${URL_PREFIX}/unused-css-coverage.html`,
      },
      {
        'total': '198',
        'unused': '198',
        'url': `${URL_PREFIX}/not-initially-used.css`,
      },
      {
        'total': '196',
        'unused': '196',
        'url': `${URL_PREFIX}/unused.css`,
      },
      {
        'total': '198',
        'unused': '174',
        'url': `${URL_PREFIX}/used.css`,
      },
      {
        'total': '0',
        'unused': '0',
        'url': `${URL_PREFIX}/empty.css`,
      },
    ]);

    await target.evaluate('appendStylesheet()');

    assert.deepInclude(await getCoverageData(6), {
      'total': '0',
      'unused': '0',
      'url': `${URL_PREFIX}/lazily-loaded.css`,
    });

    await target.evaluate('appendElement()');

    await waitForElementWithTextContent(`${URL_PREFIX}/not-initially-used.cssCSS198198100%`);
    assert.deepInclude(await getCoverageData(6), {
      'total': '198',
      'unused': '198',
      'url': `${URL_PREFIX}/not-initially-used.css`,
    });
  });
});
