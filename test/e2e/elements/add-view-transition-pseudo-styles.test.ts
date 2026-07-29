// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  expandSelectedNodeRecursively,
  forcePseudoState,
  goToResourceAndWaitForStyleSection,
  waitForAndClickTreeElementWithPartialText,
  waitForExactStyleRule,
} from '../helpers/elements-helpers.js';

describe('View transition pseudo styles on inspector stylesheet', () => {
  // Flaking on multiple bots on CQ.
  it('should add view transition pseudo styles on inspector stylesheet when a view transition pseudo is added',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection(devToolsPage, inspectedPage, 'elements/view-transition.html');
       await forcePseudoState(devToolsPage, 'Emulate a focused page', undefined);

       await inspectedPage.bringToFront();
       await inspectedPage.evaluate('startFirstViewTransition()');

       await devToolsPage.bringToFront();
       await waitForAndClickTreeElementWithPartialText(devToolsPage, '::view-transition');
       await waitForExactStyleRule(devToolsPage, '::view-transition');

       await expandSelectedNodeRecursively(devToolsPage);
       await waitForAndClickTreeElementWithPartialText(devToolsPage, '::view-transition-old(root)');
       await waitForExactStyleRule(devToolsPage, '::view-transition-old(root)');
     });
});
