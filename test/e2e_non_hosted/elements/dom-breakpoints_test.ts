// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  goToResourceAndWaitForStyleSection,
  isDOMBreakpointEnabled,
  setDOMBreakpointOnSelectedNode,
  toggleDOMBreakpointCheckbox,
  waitForElementsDOMBreakpointsSection,
} from '../../e2e/helpers/elements-helpers.js';

describe('Elements DOM Breakpoints section', () => {
  it('avoids duplication and persists DOM breakpoint state between page reloads',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection('empty.html', devToolsPage, inspectedPage);
       await setDOMBreakpointOnSelectedNode('subtree modifications', devToolsPage);

       await waitForElementsDOMBreakpointsSection(devToolsPage);
       const breakpoints = await devToolsPage.$$('.breakpoint-entry');
       assert.lengthOf(breakpoints, 1);
       assert.isTrue(await isDOMBreakpointEnabled(breakpoints[0], devToolsPage));

       // Disable the DOM breakpoint
       await toggleDOMBreakpointCheckbox(breakpoints[0], false, devToolsPage);

       // Reload the test page and validate the DOM breakpoint is still disabled
       await inspectedPage.reload();
       await waitForElementsDOMBreakpointsSection(devToolsPage);
       const newBreakpoints = await devToolsPage.$$('.breakpoint-entry');

       assert.lengthOf(newBreakpoints, 1);
       assert.isFalse(await isDOMBreakpointEnabled(newBreakpoints[0], devToolsPage));
     });
});
