// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  navigateToConsoleTab,
} from '../../e2e/helpers/console-helpers.js';
import {setIgnoreListPattern} from '../../e2e/helpers/settings-helpers.js';
import {
  getVisibleTextContents,
  replacePuppeteerUrl,
} from '../../shared/helper.js';

describe('Ignore list', () => {
  it('can be toggled on and off in console stack trace', async ({devToolsPage, inspectedPage}) => {
    await setIgnoreListPattern('thirdparty', devToolsPage);

    await inspectedPage.goToResource('../resources/sources/multi-files.html');
    await navigateToConsoleTab(devToolsPage);
    await inspectedPage.evaluate('wrapper(() => {console.trace("test");});');

    await devToolsPage.waitFor('.stack-preview-container:not(.show-hidden-rows)');
    await devToolsPage.waitForVisible('.show-all-link');

    const minimized = [
      '(anonymous) @ (index):1',
      '(anonymous) @ (index):1',
    ];
    const full = [
      '(anonymous) @ (index):1',
      'innercall @ multi-files-thirdparty.js:8',
      'callfunc @ multi-files-thirdparty.js:16',
      '(anonymous) @ (index):1',
    ];

    assert.deepEqual(
        (await getVisibleTextContents('.stack-preview-container tbody tr', devToolsPage))
            .map((value: string|null) => value ? replacePuppeteerUrl(value) : value),
        minimized);

    await devToolsPage.click('.show-all-link .link');
    await devToolsPage.waitFor('.stack-preview-container.show-hidden-rows');
    await devToolsPage.waitForVisible('.show-less-link');

    assert.deepEqual(
        (await getVisibleTextContents('.stack-preview-container tbody tr', devToolsPage))
            .map((value: string|null) => value ? replacePuppeteerUrl(value) : value),
        full);

    await devToolsPage.click('.show-less-link .link');
    await devToolsPage.waitFor('.stack-preview-container:not(.show-hidden-rows)');
    await devToolsPage.waitForVisible('.show-all-link');

    assert.deepEqual(
        (await getVisibleTextContents('.stack-preview-container tbody tr', devToolsPage))
            .map((value: string|null) => value ? replacePuppeteerUrl(value) : value),
        minimized);
  });
});
