// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import type * as puppeteer from 'puppeteer-core';

import {
  addBreakpointForLine,
  getLineNumberElement,
  isBreakpointSet,
  isEqualOrAbbreviation,
  openSourceCodeEditorForFile,
  retrieveCodeMirrorEditorContent,
} from '../helpers/sources-helpers.js';

import {
  $,
  assertNotNullOrUndefined,
  waitForFunction,
  waitFor,
  activeElementTextContent,
  getBrowserAndPages,
  waitForMany,
  clickElement,
} from '../../shared/helper.js';

const BREAKPOINT_VIEW_COMPONENT = 'devtools-breakpoint-view';
const FIRST_BREAKPOINT_ITEM_SELECTOR = '[data-first-breakpoint]';
const BREAKPOINT_ITEM_SELECTOR = '.breakpoint-item';
const LOCATION_SELECTOR = '.location';
const GROUP_HEADER_TITLE_SELECTOR = '.group-header-title';
const CODE_SNIPPET_SELECTOR = '.code-snippet';

async function extractTextContentIfConnected(element: puppeteer.ElementHandle): Promise<string|null> {
  return element.evaluate(element => element.isConnected ? element.textContent : null);
}

describe('The Breakpoints Sidebar', () => {
  describe('for source mapped files', () => {
    it('correctly shows the breakpoint location on reload', async () => {
      const testBreakpointContent = async (expectedFileName: string, expectedLineNumber: number) => {
        await checkFileGroupName(expectedFileName);
        await checkLineNumber(BREAKPOINT_ITEM_SELECTOR, expectedLineNumber);
      };

      const {target} = getBrowserAndPages();
      const setBreakpointLine = 14;
      const expectedResolvedLineNumber = 17;
      const originalSource = 'reload-breakpoints-with-source-maps-source1.js';

      await openSourceCodeEditorForFile(originalSource, 'reload-breakpoints-with-source-maps.html');

      // Set a breakpoint on the original source.
      const breakpointLineHandle = await getLineNumberElement(setBreakpointLine);
      assertNotNullOrUndefined(breakpointLineHandle);
      await clickElement(breakpointLineHandle);
      await waitForFunction(async () => await isBreakpointSet(expectedResolvedLineNumber));

      // Check if the breakpoint sidebar correctly shows the original source breakpoint.
      await testBreakpointContent(originalSource, expectedResolvedLineNumber);

      // Check if the breakpoint is correctly restored after reloading.
      await target.reload();
      await testBreakpointContent(originalSource, expectedResolvedLineNumber);
    });
  });

  describe('for JS files', () => {
    const expectedLocations = [3, 4, 9];
    const fileName = 'click-breakpoint.js';

    beforeEach(async () => {
      const {frontend} = getBrowserAndPages();
      await openSourceCodeEditorForFile(fileName, 'click-breakpoint.html');

      for (const location of expectedLocations) {
        await addBreakpointForLine(frontend, location);
      }

      await waitForMany(BREAKPOINT_ITEM_SELECTOR, 3);
    });

    it('shows the correct location', async () => {
      for (let i = 0; i < expectedLocations.length; ++i) {
        const selector = `${BREAKPOINT_ITEM_SELECTOR}:nth-of-type(${i + 1})`;
        await checkLineNumber(selector, expectedLocations[i]);
      }
    });

    it('shows the correct file name', async () => {
      await checkFileGroupName(fileName);
    });

    it('shows the correct code snippets', async () => {
      const breakpointItems = await waitForMany(BREAKPOINT_ITEM_SELECTOR, 3);
      const actualCodeSnippets = await Promise.all(breakpointItems.map(async breakpoint => {
        const codeSnippetHandle = await waitFor(CODE_SNIPPET_SELECTOR, breakpoint);
        const content = await extractTextContentIfConnected(codeSnippetHandle);
        assertNotNullOrUndefined(content);
        return content;
      }));

      const sourceContent = await retrieveCodeMirrorEditorContent();
      const expectedCodeSnippets = expectedLocations.map(line => sourceContent[line - 1]);

      assert.deepStrictEqual(actualCodeSnippets, expectedCodeSnippets);
    });
  });

  describe('for wasm files', () => {
    it('shows the correct code snippets', async () => {
      const {frontend} = getBrowserAndPages();
      await openSourceCodeEditorForFile('memory.wasm', 'wasm/memory.html');
      await addBreakpointForLine(frontend, '0x037');

      const codeSnippetHandle = await waitFor(`${BREAKPOINT_ITEM_SELECTOR} ${CODE_SNIPPET_SELECTOR}`);
      const actualCodeSnippet = await extractTextContentIfConnected(codeSnippetHandle);

      const sourceContent = await retrieveCodeMirrorEditorContent();

      const expectedCodeSnippet = sourceContent[3];
      assert.strictEqual(actualCodeSnippet, expectedCodeSnippet);
    });
  });

  it('will keep the focus on breakpoint items whose location has changed after disabling', async () => {
    await openSourceCodeEditorForFile('breakpoint-on-comment.js', 'breakpoint-on-comment.html');

    // Set a breakpoint on a comment and expect it to slide.
    const originalBreakpointLine = 3;
    const slidBreakpointLine = 5;
    const breakpointLine = await getLineNumberElement(originalBreakpointLine);
    assertNotNullOrUndefined(breakpointLine);
    await clickElement(breakpointLine);
    await waitForFunction(async () => await isBreakpointSet(slidBreakpointLine));

    const breakpointView = await $(BREAKPOINT_VIEW_COMPONENT);
    assertNotNullOrUndefined(breakpointView);

    // Click on the first breakpoint item to 1. disable and 2. focus.
    const breakpointItem = await waitFor(FIRST_BREAKPOINT_ITEM_SELECTOR, breakpointView);
    assertNotNullOrUndefined(breakpointItem);

    const checkbox = await breakpointItem.$('input');
    assertNotNullOrUndefined(checkbox);
    await clickElement(checkbox);

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
    const focusedTextContent = await activeElementTextContent();
    assert.strictEqual(focusedTextContent, breakpointItemTextContent);
  });
});

async function checkFileGroupName(expectedFileName: string) {
  await waitForFunction(async () => {
    const titleHandle = await waitFor(GROUP_HEADER_TITLE_SELECTOR);
    const actualFileName = await extractTextContentIfConnected(titleHandle);
    return actualFileName && isEqualOrAbbreviation(actualFileName, expectedFileName);
  });
}

async function checkLineNumber(breakpointItemSelector: string, expectedLineNumber: number) {
  await waitForFunction(async () => {
    const breakpointItem = await waitFor(breakpointItemSelector);
    const locationHandle = await waitFor(LOCATION_SELECTOR, breakpointItem);
    const content = await extractTextContentIfConnected(locationHandle);
    return content && expectedLineNumber === parseInt(content, 10);
  });
}
