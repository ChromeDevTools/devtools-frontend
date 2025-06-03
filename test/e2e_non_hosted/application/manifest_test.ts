// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getTrimmedTextContent, navigateToApplicationTab} from '../../e2e/helpers/application-helpers.js';

const MANIFEST_SELECTOR = '[aria-label="Manifest: Invoke to scroll to the top of manifest"]';
const APP_ID_SELECTOR = '[aria-label="App Id"]';
const FIELD_NAMES_SELECTOR = '.report-field-name';
const FIELD_VALUES_SELECTOR = '.report-field-value';

describe('The Manifest Page', () => {
  // TODO (b/416264654): Update navigateToApplicationTab helper to work in docked mode
  setup({dockingMode: 'undocked'});

  it('shows app id', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('app-manifest-id', devToolsPage, inspectedPage);
    await devToolsPage.click(MANIFEST_SELECTOR);
    await devToolsPage.waitFor(APP_ID_SELECTOR);

    const fieldNames = await getTrimmedTextContent(FIELD_NAMES_SELECTOR, devToolsPage);
    const fieldValues = await getTrimmedTextContent(FIELD_VALUES_SELECTOR, devToolsPage);
    assert.strictEqual(fieldNames[3], 'Computed App ID');
    assert.strictEqual(fieldValues[3], `https://localhost:${inspectedPage.serverPort}/some_idLearn more`);
  });

  it('shows start id as app id', async ({devToolsPage, inspectedPage}) => {
    await navigateToApplicationTab('app-manifest-no-id', devToolsPage, inspectedPage);
    await devToolsPage.click(MANIFEST_SELECTOR);
    await devToolsPage.waitFor(APP_ID_SELECTOR);

    const fieldNames = await getTrimmedTextContent(FIELD_NAMES_SELECTOR, devToolsPage);
    const fieldValues = await getTrimmedTextContent(FIELD_VALUES_SELECTOR, devToolsPage);
    assert.strictEqual(fieldNames[3], 'Computed App ID');
    assert.strictEqual(
        fieldValues[3],
        `https://localhost:${inspectedPage.serverPort}/test/e2e/resources/application/some_start_url` +
            'Learn moreNote: id is not specified in the manifest, start_url is used instead. To specify an ' +
            'App ID that matches the current identity, set the id field to /test/e2e/resources/application/some_start_url .',
    );
    await devToolsPage.waitFor('button[title="Copy suggested ID to clipboard"]');
  });
});
