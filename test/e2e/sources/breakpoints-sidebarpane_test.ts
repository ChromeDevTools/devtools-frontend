// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  getLineNumberElement,
  isBreakpointSet,
  openSourceCodeEditorForFile,
} from '../helpers/sources-helpers.js';

import {
  $,
  assertNotNullOrUndefined,
  click,
  enableExperiment,
  waitForFunction,
  waitFor,
  activeElementTextContent,
  type puppeteer,
} from '../../shared/helper.js';

const BREAKPOINT_VIEW_COMPONENT = 'devtools-breakpoint-view';
const FIRST_BREAKPOINT_ITEM_SELECTOR = '[data-first-breakpoint]';
const LOCATION_SELECTOR = '.location';

async function extractTextContentIfConnected(element: puppeteer.ElementHandle): Promise<string|null> {
  return element.evaluate(element => element.isConnected ? element.textContent : null);
}

describe('The Breakpoints Sidebar', () => {
  it('will keep the focus on breakpoint items whose location has changed after disabling', async () => {
    await enableExperiment('breakpointView');
    await openSourceCodeEditorForFile('breakpoint-on-comment.js', 'breakpoint-on-comment.html');

    // Set a breakpoint on a comment and expect it to slide.
    const originalBreakpointLine = 3;
    const slidBreakpointLine = 5;
    const breakpointLine = await getLineNumberElement(originalBreakpointLine);
    assertNotNullOrUndefined(breakpointLine);
    await click(breakpointLine);
    await waitForFunction(async () => await isBreakpointSet(slidBreakpointLine));

    const breakpointView = await $(BREAKPOINT_VIEW_COMPONENT);
    assertNotNullOrUndefined(breakpointView);

    // Click on the first breakpoint item to 1. disable and 2. focus.
    const breakpointItem = await waitFor(FIRST_BREAKPOINT_ITEM_SELECTOR, breakpointView);
    assertNotNullOrUndefined(breakpointItem);

    const checkbox = await breakpointItem.$('input');
    assertNotNullOrUndefined(checkbox);
    await click(checkbox);

    // Wait until the click has propagated: the line is updated with the new location.
    await waitForFunction(async () => await isBreakpointSet(originalBreakpointLine));
    let breakpointItemTextContent: string|null = null;
    await waitForFunction(async () => {
      const updatedBreakpointItem = await waitFor(FIRST_BREAKPOINT_ITEM_SELECTOR, breakpointView);
      breakpointItemTextContent = await extractTextContentIfConnected(updatedBreakpointItem);
      const location = await waitFor(LOCATION_SELECTOR, updatedBreakpointItem);
      const locationString = await extractTextContentIfConnected(location);
      return locationString === `${originalBreakpointLine}`;
    });

    // Check that the breakpoint item still has focus although the ui location has changed.
    assertNotNullOrUndefined(breakpointItemTextContent);
    const focusedTextContent = await activeElementTextContent();
    assert.strictEqual(focusedTextContent, breakpointItemTextContent);
  });
});
