// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getCurrentConsoleMessages,
  Level,
  navigateToConsoleTab,
  toggleShowLogXmlHttpRequests,
  typeIntoConsoleAndWaitForResult,
} from '../../e2e/helpers/console-helpers.js';

describe('The Console Tab', () => {
  it('is able to log fetching when XMLHttpRequest Logging is enabled', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('../resources/console/console-fetch-logging.html');
    await navigateToConsoleTab(devToolsPage);
    await toggleShowLogXmlHttpRequests(devToolsPage);
    const expectedResults = [
      `Fetch finished loading: GET "https://localhost:${
          inspectedPage.serverPort}/test/e2e/resources/console/xhr-exists.html".`,
      `Fetch failed loading: GET "https://localhost:${
          inspectedPage.serverPort}/test/e2e/resources/console/xhr-does-not-exist.html".`,
      `Fetch finished loading: POST "https://localhost:${
          inspectedPage.serverPort}/test/e2e/resources/console/post-target.rawresponse".`,
      'Fetch failed loading: GET "http://localhost:8000/devtools/resources/xhr-exists.html".',
    ];

    await typeIntoConsoleAndWaitForResult('await makeRequests();', 4, Level.Info, devToolsPage);

    const result = await getCurrentConsoleMessages(false, Level.Info, undefined, devToolsPage);
    assert.deepEqual(result.slice(0, -1), expectedResults, 'Fetching was not logged correctly');
  });

  it('does not log fetching when XMLHttpRequest Logging is disabled', async ({devToolsPage, inspectedPage}) => {
    await inspectedPage.goToResource('../resources/console/console-fetch-logging.html');
    await navigateToConsoleTab(devToolsPage);
    const expectedResults = [
      `Fetch finished loading: GET "https://localhost:${
          inspectedPage.serverPort}/test/e2e/resources/console/xhr-exists.html".`,
      `Fetch failed loading: GET "https://localhost:${
          inspectedPage.serverPort}/test/e2e/resources/console/xhr-does-not-exist.html".`,
      `Fetch finished loading: POST "https://localhost:${
          inspectedPage.serverPort}/test/e2e/resources/console/post-target.rawresponse".`,
      'Fetch failed loading: GET "http://localhost:8000/devtools/resources/xhr-exists.html".',
    ];

    await typeIntoConsoleAndWaitForResult('await makeRequests();', 1, Level.Info, devToolsPage);

    const result = await getCurrentConsoleMessages(false, Level.Info, undefined, devToolsPage);
    // Check that fetching is not logged
    assert.isEmpty(
        result.slice(0, -1).filter(value => expectedResults.includes(value)),
        'Fetching was logged after it was turned off');
  });
});
