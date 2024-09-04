// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  getBrowserAndPages,
  getTestServerPort,
  goToResource,
  waitFor,
} from '../../shared/helper.js';
import {
  getCoverageData,
  startInstrumentingCoverage,
  waitForTheCoveragePanelToLoad,
} from '../helpers/coverage-helpers.js';

describe('Coverage Panel', function() {
  // This test takes longer than usual because as we need to wait for the coverage data to be loaded and datagrid expanded.
  this.timeout(20000);
  beforeEach(async () => {
    await waitForTheCoveragePanelToLoad();
    await startInstrumentingCoverage();
    await goToResource('coverage/with-source-map.html');
    const resultsElement = await waitFor('.coverage-results');
    await click('#tab-coverage');  // Make sure the focus is on the coverage tab.
    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press('Enter');  // Focus on coverage view
    await waitFor(
        '.data-grid-data-grid-node.revealed.parent', resultsElement);  // wait for the parent node to be loaded
    await frontend.keyboard.press('ArrowDown');                        // select the parent node
    await waitFor(
        '.data-grid-data-grid-node.revealed.parent.selected',
        resultsElement);                          // wait for the first item to be selected
    await frontend.keyboard.press('ArrowRight');  // expand
    await waitFor(
        '.data-grid-data-grid-node.revealed.parent.selected.expanded',
        resultsElement);                                                      // wait for the first item to be expanded
    await waitFor('.data-grid-data-grid-node:not(.parent)', resultsElement);  // wait for children to be loaded
  });

  // Flakily has navigation errors in the "beforeEach".
  it.skip('[crbug.com/1508272] Shows coverage data for sources if a script has source map', async () => {
    const URL_PREFIX = `https://localhost:${getTestServerPort()}/test/e2e/resources/coverage`;
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
    assert.deepEqual(await getCoverageData(5), expected);
  });
  it('Can update and sort the coverage information for sources', async () => {
    const {target} = getBrowserAndPages();
    await target.evaluate(() => {
      const buttonToExecuteCode = document.querySelector('#first-button') as HTMLElement;
      buttonToExecuteCode.click();
    });
    const URL_PREFIX = `https://localhost:${getTestServerPort()}/test/e2e/resources/coverage`;
    const result = await getCoverageData(6);
    result.pop();  // remove the last item, which is the coverage for the eval code
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
    assert.deepEqual(result, expected);
  });
});
