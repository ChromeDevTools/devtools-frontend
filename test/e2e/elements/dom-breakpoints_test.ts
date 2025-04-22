// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages} from '../../conductor/puppeteer-state.js';
import {
  getDOMBreakpoints,
  goToResourceAndWaitForStyleSection,
  isDOMBreakpointEnabled,
  setDOMBreakpointOnSelectedNode,
  toggleDOMBreakpointCheckbox,
  waitForElementsDOMBreakpointsSection,
} from '../helpers/elements-helpers.js';

describe('Elements DOM Breakpoints section', () => {
  it('avoids duplication and persists DOM breakpoint state between page reloads', async () => {
    await goToResourceAndWaitForStyleSection('empty.html');
    await setDOMBreakpointOnSelectedNode('subtree modifications');

    await waitForElementsDOMBreakpointsSection();
    const breakpoints = await getDOMBreakpoints();
    assert.lengthOf(breakpoints, 1);
    assert.isTrue(await isDOMBreakpointEnabled(breakpoints[0]));

    // Disable the DOM breakpoint
    await toggleDOMBreakpointCheckbox(breakpoints[0], /* enabled**/ false);

    // Reload the test page and validate the DOM breakpoint is still disabled
    const {target} = getBrowserAndPages();
    await target.reload();
    await waitForElementsDOMBreakpointsSection();
    const newBreakpoints = await getDOMBreakpoints();

    assert.lengthOf(newBreakpoints, 1);
    assert.isFalse(await isDOMBreakpointEnabled(newBreakpoints[0]));
  });
});
