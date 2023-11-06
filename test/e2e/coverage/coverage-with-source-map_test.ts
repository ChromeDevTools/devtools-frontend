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
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  getCoverageData,
  startInstrumentingCoverage,
  waitForTheCoveragePanelToLoad,
} from '../helpers/coverage-helpers.js';

describe('The Coverage Panel', async () => {
  beforeEach(async () => {
    await waitForTheCoveragePanelToLoad();
    await startInstrumentingCoverage();
    await goToResource('coverage/with-source-map.html');
    await waitFor('.coverage-results');
    await click('#tab-coverage');  // Make sure the focus is on the coverage tab.
    const {frontend} = getBrowserAndPages();
    await frontend.keyboard.press('Enter');       // Focus on coverage view
    await frontend.keyboard.press('ArrowDown');   // select the fist item
    await frontend.keyboard.press('ArrowRight');  // expand
  });

  it('Shows coverage data for sources if a script has source map', async () => {
    const URL_PREFIX = `https://localhost:${getTestServerPort()}/test/e2e/resources/coverage`;
    const expected = [
      {
        'total': '1 445',
        'unused': '783',
        'url': `${URL_PREFIX}/with-source-map.js`,
      },
      {
        'total': '897',
        'unused': '531',
        'url': `${URL_PREFIX}/webpack/bootstrap.js`,
      },
      {
        'total': '335',
        'unused': '147',
        'url': `${URL_PREFIX}/src/script.ts`,
      },
      {
        'total': '120',
        'unused': '66',
        'url': `${URL_PREFIX}/src/users.ts`,
      },
      {
        'total': '42',
        'unused': '39',
        'url': `${URL_PREFIX}/src/animal.ts`,
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
        'total': '1 445',
        'unused': '682',
        'url': `${URL_PREFIX}/with-source-map.js`,
      },
      {
        'total': '897',
        'unused': '531',
        'url': `${URL_PREFIX}/webpack/bootstrap.js`,
      },
      {
        'total': '335',
        'unused': '84',
        'url': `${URL_PREFIX}/src/script.ts`,
      },
      {
        'total': '42',
        'unused': '39',
        'url': `${URL_PREFIX}/src/animal.ts`,
      },
      // Some code in users.ts file has been executed, so the unused lines are now less than animal.ts
      {
        'total': '120',
        'unused': '28',
        'url': `${URL_PREFIX}/src/users.ts`,
      },
    ];
    assert.deepEqual(result, expected);
  });
});
