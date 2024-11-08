// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages} from '../../shared/helper.js';
import {
  expandSelectedNodeRecursively,
  forcePseudoState,
  goToResourceAndWaitForStyleSection,
  waitForAndClickTreeElementWithPartialText,
  waitForExactStyleRule,
} from '../helpers/elements-helpers.js';

describe('View transition pseudo styles on inspector stylesheet', () => {
  // Flaking on multiple bots on CQ.
  it.skipOnPlatforms(
      ['mac'],
      '[crbug.com/40811680]: should add view transition pseudo styles on inspector stylesheet when a view transition pseudo is added',
      async () => {
        const {frontend, target} = getBrowserAndPages();
        await goToResourceAndWaitForStyleSection('elements/view-transition.html');
        await forcePseudoState('Emulate a focused page');

        await target.bringToFront();
        await target.evaluate('startFirstViewTransition()');

        await frontend.bringToFront();
        await waitForAndClickTreeElementWithPartialText('::view-transition');
        await waitForExactStyleRule('::view-transition');

        await expandSelectedNodeRecursively();
        await waitForAndClickTreeElementWithPartialText('::view-transition-old(root)');
        await waitForExactStyleRule('::view-transition-old(root)');
      });
});
