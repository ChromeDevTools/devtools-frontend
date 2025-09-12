// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  expandSelectedNodeRecursively,
  forcePseudoState,
  goToResourceAndWaitForStyleSection,
  waitForAndClickTreeElementWithPartialText,
  waitForExactStyleRule,
} from '../../e2e/helpers/elements-helpers.js';

describe('View transition pseudo styles on inspector stylesheet', () => {
  // Flaking on multiple bots on CQ.
  it('should add view transition pseudo styles on inspector stylesheet when a view transition pseudo is added',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('elements/view-transition.html', devToolsPage, inspectedPage);
       await forcePseudoState('Emulate a focused page', undefined, devToolsPage);

       await inspectedPage.bringToFront();
       await inspectedPage.evaluate('startFirstViewTransition()');

       await devToolsPage.bringToFront();
       await waitForAndClickTreeElementWithPartialText('::view-transition', devToolsPage);
       await waitForExactStyleRule('::view-transition', devToolsPage);

       await expandSelectedNodeRecursively(devToolsPage);
       await waitForAndClickTreeElementWithPartialText('::view-transition-old(root)', devToolsPage);
       await waitForExactStyleRule('::view-transition-old(root)', devToolsPage);
     });
});
