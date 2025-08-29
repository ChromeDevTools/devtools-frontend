// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  elementContainsTextWithSelector,
  navigateToNetworkTab,
  selectRequestByName,
  waitForSomeRequestsToAppear,
} from '../../e2e/helpers/network-helpers.js';
import {
  isPrettyPrinted,
  retrieveCodeMirrorEditorContent,
} from '../../e2e/helpers/sources-helpers.js';

const PRETTY_PRINT_BUTTON = '[aria-label="Pretty print"]';

describe('The Network Tab', function() {
  it('can pretty print an inline json subtype file', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('code-with-json-subtype-request.html', devToolsPage, inspectedPage);
    await waitForSomeRequestsToAppear(2, devToolsPage);
    await selectRequestByName('json-subtype-ld.rawresponse', {devToolsPage});

    const networkView = await devToolsPage.waitFor('.network-item-view');
    await devToolsPage.click('#tab-headers-component', {
      root: networkView,
    });

    await devToolsPage.click('[aria-label=Response][role="tab"]', {
      root: networkView,
    });
    await devToolsPage.waitFor('[aria-label=Response][role=tab][aria-selected=true]', networkView);

    const editor = await devToolsPage.waitFor('[aria-label="Code editor"]');

    const textFromResponse = await retrieveCodeMirrorEditorContent(devToolsPage);

    const expectedTextFromResponse = [
      '{',
      '    "Keys": [',
      '        {',
      '            "Key1": "Value1",',
      '            "Key2": "Value2",',
      '            "Key3": true',
      '        },',
      '        {',
      '            "Key1": "Value1",',
      '            "Key2": "Value2",',
      '            "Key3": false',
      '        }',
      '    ]',
      '}',
    ];

    assert.deepEqual(textFromResponse, expectedTextFromResponse);

    await devToolsPage.waitForFunction(async () => await isPrettyPrinted(devToolsPage));
    assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

    assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));

    await devToolsPage.click(PRETTY_PRINT_BUTTON);

    const actualNotPrettyText = await retrieveCodeMirrorEditorContent(devToolsPage);
    const expectedNotPrettyText =
        '{"Keys": [{"Key1": "Value1","Key2": "Value2","Key3": true},{"Key1": "Value1","Key2": "Value2","Key3": false}]},';

    assert.strictEqual(expectedNotPrettyText, actualNotPrettyText.toString());

    await devToolsPage.waitForFunction(async () => !(await isPrettyPrinted(devToolsPage)));
    assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

    assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));
  });

  it('can pretty print when there is only one json or json subtype file', async ({devToolsPage, inspectedPage}) => {
    await navigateToNetworkTab('json-subtype-ld.rawresponse', devToolsPage, inspectedPage);
    await waitForSomeRequestsToAppear(1, devToolsPage);
    await selectRequestByName('json-subtype-ld.rawresponse', {devToolsPage});

    const networkView = await devToolsPage.waitFor('.network-item-view');
    await devToolsPage.click('#tab-headers-component', {
      root: networkView,
    });

    await devToolsPage.click('[aria-label=Response][role="tab"]', {
      root: networkView,
    });
    await devToolsPage.waitFor('[aria-label=Response][role=tab][aria-selected=true]', networkView);

    const editor = await devToolsPage.waitFor('[aria-label="Code editor"]');

    const textFromResponse = await retrieveCodeMirrorEditorContent(devToolsPage);

    const expectedTextFromResponse = [
      '{',
      '    "Keys": [',
      '        {',
      '            "Key1": "Value1",',
      '            "Key2": "Value2",',
      '            "Key3": true',
      '        },',
      '        {',
      '            "Key1": "Value1",',
      '            "Key2": "Value2",',
      '            "Key3": false',
      '        }',
      '    ]',
      '}',
    ];

    assert.deepEqual(textFromResponse, expectedTextFromResponse);

    await devToolsPage.waitForFunction(async () => await isPrettyPrinted(devToolsPage));
    assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

    assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));
  });
});
