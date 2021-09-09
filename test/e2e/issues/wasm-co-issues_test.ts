// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {assertNotNullOrUndefined, goToResourceWithCustomHost} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {ensureResourceSectionIsExpanded, expandIssue, getIssueByTitle, getResourcesElement, navigateToIssuesTab, waitForTableFromResourceSectionContents} from '../helpers/issues-helpers.js';

describe('Wasm cross-origin sharing issue', async () => {
  beforeEach(async () => {
    await goToResourceWithCustomHost('a.devtools.test', 'issues/wasm-co-sharing.html');
  });

  // Disabled until wasm module sharing is reenabled.
  it.skip('[crbug.com/1247980] should appear when cross-origin sharing a wasm module', async () => {
    await navigateToIssuesTab();
    await expandIssue();
    const issueElement = await getIssueByTitle('Share WebAssembly modules only between same-origin environments');
    assertNotNullOrUndefined(issueElement);
    const section = await getResourcesElement('module', issueElement);
    const text = await section.label.evaluate(el => el.textContent);
    assert.strictEqual(text, '1 module');
    await ensureResourceSectionIsExpanded(section);
    const expectedTableRows = [
      [
        'Wasm Module URL',
        'Source Origin',
        'Target Origin',
        'Status',
      ],
      [
        /.*a.devtools.test.*wasm/,
        /.*a.devtools.test.*/,
        /.*b.devtools.test.*/,
        /warning|blocked/,
      ],
    ];
    await waitForTableFromResourceSectionContents(section.content, expectedTableRows);
  });
});
