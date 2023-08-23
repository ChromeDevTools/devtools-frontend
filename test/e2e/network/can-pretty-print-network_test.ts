// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  step,
  waitFor,
} from '../../shared/helper.js';
import {
  elementContainsTextWithSelector,
  navigateToNetworkTab,
  selectRequestByName,
  waitForSomeRequestsToAppear,
} from '../helpers/network-helpers.js';
import {
  isPrettyPrinted,
  retrieveCodeMirrorEditorContent,
} from '../helpers/sources-helpers.js';

const PRETTY_PRINT_BUTTON = '[aria-label="Pretty print"]';

describe('The Network Tab', function() {
  it('can pretty print an inline json subtype file', async () => {
    await navigateToNetworkTab('code-with-json-subtype-request.html');
    await waitForSomeRequestsToAppear(2);
    await selectRequestByName('json-subtype-ld.rawresponse');

    const networkView = await waitFor('.network-item-view');
    await click('#tab-headersComponent', {
      root: networkView,
    });

    await click('[aria-label=Response][role="tab"]', {
      root: networkView,
    });
    await waitFor('[aria-label=Response][role=tab][aria-selected=true]', networkView);

    const editor = await waitFor('[aria-label="Code editor"]');

    await step('can pretty-print a json subtype', async () => {
      const textFromResponse = await retrieveCodeMirrorEditorContent();

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

      assert.deepStrictEqual(textFromResponse, expectedTextFromResponse);
    });

    await step('can highlight the pretty-printed text', async () => {
      assert.isTrue(await isPrettyPrinted());
      assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

      assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));
    });

    await click(PRETTY_PRINT_BUTTON);

    await step('can un-pretty-print a json subtype', async () => {
      const actualNotPrettyText = await retrieveCodeMirrorEditorContent();
      const expectedNotPrettyText =
          '{"Keys": [{"Key1": "Value1","Key2": "Value2","Key3": true},{"Key1": "Value1","Key2": "Value2","Key3": false}]}';

      assert.strictEqual(expectedNotPrettyText, actualNotPrettyText.toString());
    });

    await step('can highlight the un-pretty-printed text', async () => {
      assert.isFalse(await isPrettyPrinted());
      assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

      assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));
    });
  });

  it('can pretty print when there is only one json or json subtype file', async () => {
    await navigateToNetworkTab('json-subtype-ld.rawresponse');
    await waitForSomeRequestsToAppear(1);
    await selectRequestByName('json-subtype-ld.rawresponse');

    const networkView = await waitFor('.network-item-view');
    await click('#tab-headersComponent', {
      root: networkView,
    });

    await click('[aria-label=Response][role="tab"]', {
      root: networkView,
    });
    await waitFor('[aria-label=Response][role=tab][aria-selected=true]', networkView);

    const editor = await waitFor('[aria-label="Code editor"]');

    await step('can pretty-print a json subtype', async () => {
      const textFromResponse = await retrieveCodeMirrorEditorContent();

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

      assert.deepStrictEqual(textFromResponse, expectedTextFromResponse);
    });

    await step('can highlight the pretty-printed text', async () => {
      assert.isTrue(await isPrettyPrinted());
      assert.isTrue(await elementContainsTextWithSelector(editor, '"Value1"', '.token-string'));

      assert.isTrue(await elementContainsTextWithSelector(editor, 'true', '.token-atom'));
    });
  });
});
