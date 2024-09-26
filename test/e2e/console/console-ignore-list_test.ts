// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  click,
  getBrowserAndPages,
  getVisibleTextContents,
  goToResource,
  replacePuppeteerUrl,
  waitFor,
  waitForVisible,
} from '../../shared/helper.js';

import {navigateToConsoleTab} from '../helpers/console-helpers.js';
import {setIgnoreListPattern} from '../helpers/settings-helpers.js';

describe('Ignore list', function() {
  it('can be toggled on and off in console stack trace', async function() {
    await setIgnoreListPattern('thirdparty');
    const {target} = getBrowserAndPages();

    await goToResource('../resources/sources/multi-files.html');
    await navigateToConsoleTab();
    await target.evaluate('wrapper(() => {console.trace("test");});');

    await waitFor('.stack-preview-container:not(.show-hidden-rows)');
    await waitForVisible('.show-all-link');

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
        (await getVisibleTextContents('.stack-preview-container tbody tr'))
            .map(value => value ? replacePuppeteerUrl(value) : value),
        minimized);

    await click('.show-all-link .link');
    await waitFor('.stack-preview-container.show-hidden-rows');
    await waitForVisible('.show-less-link');

    assert.deepEqual(
        (await getVisibleTextContents('.stack-preview-container tbody tr'))
            .map(value => value ? replacePuppeteerUrl(value) : value),
        full);

    await click('.show-less-link .link');
    await waitFor('.stack-preview-container:not(.show-hidden-rows)');
    await waitForVisible('.show-all-link');

    assert.deepEqual(
        (await getVisibleTextContents('.stack-preview-container tbody tr'))
            .map(value => value ? replacePuppeteerUrl(value) : value),
        minimized);
  });
});
