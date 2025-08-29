// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  clearCoverageContent,
  getCoverageData,
  navigateToCoverageTestSite,
  startInstrumentingCoverage,
  stopInstrumentingCoverage,
  waitForTheCoveragePanelToLoad,
} from '../../e2e/helpers/coverage-helpers.js';
import {
  clickOnContextMenuItemFromTab,
  MOVE_TO_MAIN_TAB_BAR_SELECTOR,
  tabExistsInMainPanel,
} from '../../e2e/helpers/cross-tool-helper.js';

const COVERAGE_TAB_ID = '#tab-coverage';

describe('The Coverage Panel', () => {
  it('Loads correctly', async ({devToolsPage}) => {
    await waitForTheCoveragePanelToLoad(devToolsPage);
  });

  it('Can start and stop instrumenting coverage', async ({devToolsPage, inspectedPage}) => {
    await waitForTheCoveragePanelToLoad(devToolsPage);
    await navigateToCoverageTestSite(inspectedPage);
    await startInstrumentingCoverage(devToolsPage);
    await stopInstrumentingCoverage(devToolsPage);
    await clearCoverageContent(devToolsPage);
  });

  it('Shows coverage data on page loads if the instrumentation has started', async ({devToolsPage, inspectedPage}) => {
    await waitForTheCoveragePanelToLoad(devToolsPage);
    await navigateToCoverageTestSite(inspectedPage);
    await startInstrumentingCoverage(devToolsPage);
    const URL_PREFIX = `${inspectedPage.getResourcesPath()}/coverage`;
    assert.deepEqual(await getCoverageData(2, devToolsPage), [
      {
        total: '193',
        unused: '35',
        url: `${URL_PREFIX}/default.html`,
      },
      {
        total: '43',
        unused: '31',
        url: `${URL_PREFIX}/script.js`,
      },
    ]);
  });

  it(
      'Shows completely uncovered css files', async ({devToolsPage, inspectedPage}) => {
        await inspectedPage.goToResource('coverage/unused-css-coverage.html');
        await waitForTheCoveragePanelToLoad(devToolsPage);
        // Bring the coverage panel to the top to ensure it has enough height to show all the rows.
        await clickOnContextMenuItemFromTab(COVERAGE_TAB_ID, MOVE_TO_MAIN_TAB_BAR_SELECTOR, devToolsPage);
        await tabExistsInMainPanel(COVERAGE_TAB_ID, devToolsPage);
        await startInstrumentingCoverage(devToolsPage);
        const URL_PREFIX = `${inspectedPage.getResourcesPath()}/coverage`;
        assert.deepEqual(await getCoverageData(5, devToolsPage), [
          {
            total: '283',
            unused: '276',
            url: `${URL_PREFIX}/unused-css-coverage.html`,
          },
          {
            total: '198',
            unused: '198',
            url: `${URL_PREFIX}/not-initially-used.css`,
          },
          {
            total: '196',
            unused: '196',
            url: `${URL_PREFIX}/unused.css`,
          },
          {
            total: '198',
            unused: '174',
            url: `${URL_PREFIX}/used.css`,
          },
          {
            total: '0',
            unused: '0',
            url: `${URL_PREFIX}/empty.css`,
          },
        ]);

        await inspectedPage.evaluate('appendStylesheet()');

        assert.deepInclude(await getCoverageData(6, devToolsPage), {
          total: '0',
          unused: '0',
          url: `${URL_PREFIX}/lazily-loaded.css`,
        });

        await inspectedPage.evaluate('appendElement()');

        await devToolsPage.waitForElementWithTextContent(`${URL_PREFIX}/not-initially-used.cssCSS198198100%`);
        assert.deepInclude(await getCoverageData(6, devToolsPage), {
          total: '198',
          unused: '198',
          url: `${URL_PREFIX}/not-initially-used.css`,
        });
      });
});
