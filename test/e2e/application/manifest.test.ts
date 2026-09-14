// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getTrimmedTextContent, navigateToApplicationTab} from '../helpers/application-helpers.js';

const MANIFEST_SELECTOR = '[aria-label="Manifest: Invoke to scroll to the top of manifest"]';
const APP_ID_SELECTOR = '[aria-label="App Id"]';
const FIELD_NAMES_SELECTOR = 'devtools-report-key';
const FIELD_VALUES_SELECTOR = 'devtools-report-value';

describe('The Manifest Page', () => {
  // TODO (b/416264654): Update navigateToApplicationTab helper to work in docked mode
  setup({dockingMode: 'undocked'});

  it('shows app id', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab(devToolsPage, inspectedPage, 'app-manifest-id');
    await devToolsPage.click(MANIFEST_SELECTOR);
    await devToolsPage.waitFor(APP_ID_SELECTOR);

    const expectedValue = `https://localhost:${inspectedPage.serverPort}/some_idLearn more`;
    await devToolsPage.waitForFunction(async () => {
      const fieldNames = await getTrimmedTextContent(devToolsPage, FIELD_NAMES_SELECTOR);
      const fieldValues = await getTrimmedTextContent(devToolsPage, FIELD_VALUES_SELECTOR);
      return fieldNames[3] === 'Computed App ID' && fieldValues[3] === expectedValue;
    });
  });

  it('shows start id as app id', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab(devToolsPage, inspectedPage, 'app-manifest-no-id');
    await devToolsPage.click(MANIFEST_SELECTOR);
    await devToolsPage.waitFor(APP_ID_SELECTOR);
    await devToolsPage.waitFor('button[title="Copy suggested ID to clipboard"]');

    const expectedValue =
        `https://localhost:${inspectedPage.serverPort}/test/e2e/resources/application/some_start_url` +
        'Learn moreNote: id is not specified in the manifest, start_url is used instead. To specify an ' +
        'App ID that matches the current identity, set the id field to ' +
        '/test/e2e/resources/application/some_start_url .';

    await devToolsPage.waitForFunction(async () => {
      const fieldNames = await getTrimmedTextContent(devToolsPage, FIELD_NAMES_SELECTOR);
      const fieldValues = await getTrimmedTextContent(devToolsPage, FIELD_VALUES_SELECTOR);
      return fieldNames[3] === 'Computed App ID' && fieldValues[3] === expectedValue;
    });
  });
});
