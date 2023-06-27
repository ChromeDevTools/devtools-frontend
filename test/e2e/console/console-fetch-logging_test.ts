// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getBrowserAndPages,
  getTestServerPort,
  goToResource,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  getCurrentConsoleMessages,
  Level,
  LOG_XML_HTTP_REQUESTS_SELECTOR,
  navigateToConsoleTab,
  toggleConsoleSetting,
  typeIntoConsoleAndWaitForResult,
} from '../helpers/console-helpers.js';

describe('The Console Tab', async () => {
  it('is able to log fetching when XMLHttpRequest Logging is enabled', async () => {
    await goToResource('../resources/console/console-fetch-logging.html');
    await navigateToConsoleTab();
    await toggleConsoleSetting(LOG_XML_HTTP_REQUESTS_SELECTOR);
    const expectedResults = [
      `Fetch finished loading: GET "https://localhost:${
          getTestServerPort()}/test/e2e/resources/console/xhr-exists.html".`,
      `Fetch failed loading: GET "https://localhost:${
          getTestServerPort()}/test/e2e/resources/console/xhr-does-not-exist.html".`,
      `Fetch finished loading: POST "https://localhost:${
          getTestServerPort()}/test/e2e/resources/console/post-target.rawresponse".`,
      'Fetch failed loading: GET "http://localhost:8000/devtools/resources/xhr-exists.html".',
    ];

    await typeIntoConsoleAndWaitForResult(getBrowserAndPages().frontend, 'await makeRequests();', 4, Level.Info);

    const result = await getCurrentConsoleMessages(false, Level.Info);
    assert.deepStrictEqual(result.slice(0, -1), expectedResults, 'Fetching was not logged correctly');
  });

  it('does not log fetching when XMLHttpRequest Logging is disabled', async () => {
    await goToResource('../resources/console/console-fetch-logging.html');
    await navigateToConsoleTab();
    const expectedResults = [
      `Fetch finished loading: GET "https://localhost:${
          getTestServerPort()}/test/e2e/resources/console/xhr-exists.html".`,
      `Fetch failed loading: GET "https://localhost:${
          getTestServerPort()}/test/e2e/resources/console/xhr-does-not-exist.html".`,
      `Fetch finished loading: POST "https://localhost:${
          getTestServerPort()}/test/e2e/resources/console/post-target.rawresponse".`,
      'Fetch failed loading: GET "http://localhost:8000/devtools/resources/xhr-exists.html".',
    ];

    await typeIntoConsoleAndWaitForResult(getBrowserAndPages().frontend, 'await makeRequests();', 1, Level.Info);

    const result = await getCurrentConsoleMessages(false, Level.Info);
    // Check that fetching is not logged
    assert.isEmpty(
        result.slice(0, -1).filter(value => expectedResults.includes(value)),
        'Fetching was logged after it was turned off');
  });
});
