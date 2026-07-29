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
} from '../helpers/elements-helpers.js';

describe('Elements DOM Breakpoints section', () => {
  it('avoids duplication and persists DOM breakpoint state between page reloads',
     async ({devToolsPage, inspectedPage}) => {
       await goToResourceAndWaitForStyleSection(devToolsPage, inspectedPage, 'empty.html');
       await setDOMBreakpointOnSelectedNode(devToolsPage, 'subtree modifications');

       await waitForElementsDOMBreakpointsSection(devToolsPage);
       const breakpoints = await devToolsPage.$$('.breakpoint-entry');
       assert.lengthOf(breakpoints, 1);
       assert.isTrue(await isDOMBreakpointEnabled(devToolsPage, breakpoints[0]));

       // Disable the DOM breakpoint
       await toggleDOMBreakpointCheckbox(devToolsPage, breakpoints[0], false);

       // Reload the test page and validate the DOM breakpoint is still disabled
       await inspectedPage.reload();
       await waitForElementsDOMBreakpointsSection(devToolsPage);
       const newBreakpoints = await devToolsPage.$$('.breakpoint-entry');

       assert.lengthOf(newBreakpoints, 1);
       assert.isFalse(await isDOMBreakpointEnabled(devToolsPage, newBreakpoints[0]));
     });
});
