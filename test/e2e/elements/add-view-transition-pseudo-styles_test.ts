// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  expandSelectedNodeRecursively,
  getDisplayedStyleRules,
  goToResourceAndWaitForStyleSection,
  waitForAndClickTreeElementWithPartialText,
  waitForExactStyleRule,
} from '../helpers/elements-helpers.js';

describe('View transition pseudo styles on inspector stylesheet', () => {
  it('should add view transition pseudo styles on inspector stylesheet when a view transition pseudo is added',
     async () => {
       const {frontend, target} = getBrowserAndPages();
       await goToResourceAndWaitForStyleSection('elements/view-transition.html');

       await target.bringToFront();
       await target.evaluate('startFirstViewTransition()');

       await frontend.bringToFront();
       await waitForAndClickTreeElementWithPartialText('::view-transition');
       await waitForExactStyleRule('::view-transition');

       await expandSelectedNodeRecursively();
       await waitForAndClickTreeElementWithPartialText('::view-transition-old(root)');
       await waitForExactStyleRule('::view-transition-old(root)');
     });

  // Flaking on multiple bots on CQ.
  it.skip(
      '[crbug.com/1512610] should not add view transition pseudo styles if inspector stylesheet already has view transition pseudo styles',
      async () => {
        const {frontend, target} = getBrowserAndPages();
        await goToResourceAndWaitForStyleSection('elements/view-transition.html');

        await target.bringToFront();
        await target.evaluate('startFirstViewTransition()');

        await frontend.bringToFront();
        await waitForAndClickTreeElementWithPartialText('::view-transition');
        await waitForExactStyleRule('::view-transition');

        await target.bringToFront();
        await target.evaluate('startNextViewTransition()');

        await frontend.bringToFront();
        await waitForAndClickTreeElementWithPartialText('::view-transition');
        await waitForExactStyleRule('::view-transition');

        const displayedRules = await getDisplayedStyleRules();
        assert.strictEqual(displayedRules.filter(rule => rule.selectorText === '::view-transition').length, 1);
      });
});
