// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getCoverageData,
  startInstrumentingCoverage,
  waitForTheCoveragePanelToLoad,
} from '../../e2e/helpers/coverage-helpers.js';
import {
  MAIN_PANEL_SELECTOR,
  MOVE_TO_MAIN_PANEL_SELECTOR,
} from '../../e2e/helpers/cross-tool-helper.js';
import type {DevToolsPage} from '../shared/frontend-helper.js';
import type {InspectedPage} from '../shared/target-helper.js';

const COVERAGE_TAB_ID = '#tab-coverage';

describe('Coverage Panel', function() {
  // This test takes longer than usual because as we need to wait for the coverage data to be loaded and datagrid expanded.
  this.timeout(20000);

  async function setupCoveragePanel(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
    await waitForTheCoveragePanelToLoad(devToolsPage);
    // Bring the coverage panel to the top to ensure it has enough height to show all the rows.
    await devToolsPage.click(COVERAGE_TAB_ID, {clickOptions: {button: 'right'}});
    await devToolsPage.click(MOVE_TO_MAIN_PANEL_SELECTOR);
    const mainPanel = await devToolsPage.waitFor(MAIN_PANEL_SELECTOR);
    await devToolsPage.waitFor(COVERAGE_TAB_ID, mainPanel);
    await startInstrumentingCoverage(devToolsPage);
    await inspectedPage.goToResource('coverage/with-source-map.html');
    const resultsElement = await devToolsPage.waitFor('.coverage-results');
    await devToolsPage.click('#tab-coverage');  // Make sure the focus is on the coverage tab.
    await devToolsPage.pressKey('Enter');       // Focus on coverage view
    await devToolsPage.waitFor(
        '.data-grid-data-grid-node.revealed.parent', resultsElement);  // wait for the parent node to be loaded
    await devToolsPage.pressKey('ArrowDown');                          // select the parent node
    await devToolsPage.waitFor(
        '.data-grid-data-grid-node.revealed.parent.selected',
        resultsElement);                        // wait for the first item to be selected
    await devToolsPage.pressKey('ArrowRight');  // expand
    await devToolsPage.waitFor(
        '.data-grid-data-grid-node.revealed.parent.selected.expanded',
        resultsElement);  // wait for the first item to be expanded
    await devToolsPage.waitFor(
        '.data-grid-data-grid-node:not(.parent)', resultsElement);  // wait for children to be loaded
  }

  it('Shows coverage data for sources if a script has source map', async ({devToolsPage, inspectedPage}) => {
    await setupCoveragePanel(devToolsPage, inspectedPage);
    const URL_PREFIX = `${inspectedPage.getResourcesPath()}/coverage`;
    const expected = [
      {
        total: '1,445',
        unused: '783',
        url: `${URL_PREFIX}/with-source-map.js`,
      },
      {
        total: '897',
        unused: '531',
        url: `${URL_PREFIX}/webpack/bootstrap.js`,
      },
      {
        total: '335',
        unused: '147',
        url: `${URL_PREFIX}/src/script.ts`,
      },
      {
        total: '120',
        unused: '66',
        url: `${URL_PREFIX}/src/users.ts`,
      },
      {
        total: '42',
        unused: '39',
        url: `${URL_PREFIX}/src/animal.ts`,
      },
    ];
    assert.deepEqual(await getCoverageData(5, devToolsPage), expected);
  });

  it('Can update and sort the coverage information for sources', async ({devToolsPage, inspectedPage}) => {
    await setupCoveragePanel(devToolsPage, inspectedPage);
    const buttonToExecuteCode = await inspectedPage.waitForSelector('#first-button');
    if (buttonToExecuteCode) {
      await buttonToExecuteCode.click();
    }
    const URL_PREFIX = `${inspectedPage.getResourcesPath()}/coverage`;
    const expected = [
      {
        total: '1,445',
        unused: '682',
        url: `${URL_PREFIX}/with-source-map.js`,
      },
      {
        total: '897',
        unused: '531',
        url: `${URL_PREFIX}/webpack/bootstrap.js`,
      },
      {
        total: '335',
        unused: '84',
        url: `${URL_PREFIX}/src/script.ts`,
      },
      {
        total: '42',
        unused: '39',
        url: `${URL_PREFIX}/src/animal.ts`,
      },
      // Some code in users.ts file has been executed, so the unused lines are now less than animal.ts
      {
        total: '120',
        unused: '28',
        url: `${URL_PREFIX}/src/users.ts`,
      },
    ];
    await devToolsPage.waitForElementWithTextContent(`${URL_PREFIX}/src/users.tsJS (per function)1202823.3%`);
    assert.deepEqual(await getCoverageData(5, devToolsPage), expected);
  });
});
