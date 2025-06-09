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
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import type {InspectedPage} from '../../e2e_non_hosted/shared/target-helper.js';
import {
  assertNotNullOrUndefined,
} from '../../shared/helper.js';

const BREAKPOINT_VIEW_COMPONENT = 'devtools-breakpoint-view';
const FIRST_BREAKPOINT_ITEM_SELECTOR = '[data-first-breakpoint]';
const BREAKPOINT_ITEM_SELECTOR = '.breakpoint-item';
const LOCATION_SELECTOR = '.location';
const GROUP_HEADER_TITLE_SELECTOR = '.group-header-title';
const CODE_SNIPPET_SELECTOR = '.code-snippet';

async function extractTextContentIfConnected(element: puppeteer.ElementHandle): Promise<string|null> {
  return await element.evaluate(element => element.isConnected ? element.textContent : null);
}

describe('The Breakpoints Sidebar', () => {
  describe('for source mapped files', () => {
    it('correctly shows the breakpoint location on reload', async ({devToolsPage, inspectedPage}) => {
      const testBreakpointContent =
          async (expectedFileName: string, expectedLineNumber: number, devToolsPage: DevToolsPage) => {
        await checkFileGroupName(expectedFileName, devToolsPage);
        await checkLineNumber(BREAKPOINT_ITEM_SELECTOR, expectedLineNumber, devToolsPage);
      };

      const setBreakpointLine = 14;
      const expectedResolvedLineNumber = 17;
      const originalSource = 'reload-breakpoints-with-source-maps-source1.js';

      await openSourceCodeEditorForFile(
          originalSource, 'reload-breakpoints-with-source-maps.html', devToolsPage, inspectedPage);

      // Set a breakpoint on the original source.
      const breakpointLineHandle = await getLineNumberElement(setBreakpointLine, devToolsPage);
      assertNotNullOrUndefined(breakpointLineHandle);
      await devToolsPage.clickElement(breakpointLineHandle);
      await devToolsPage.waitForFunction(async () => await isBreakpointSet(expectedResolvedLineNumber, devToolsPage));

      // Check if the breakpoint sidebar correctly shows the original source breakpoint.
      await testBreakpointContent(originalSource, expectedResolvedLineNumber, devToolsPage);

      // Check if the breakpoint is correctly restored after reloading.
      await inspectedPage.reload();
      await testBreakpointContent(originalSource, expectedResolvedLineNumber, devToolsPage);
    });
  });

  describe('for JS files', () => {
    const expectedLocations = [3, 4, 9];
    const fileName = 'click-breakpoint.js';

    async function setupBreakpoints(devToolsPage: DevToolsPage, inspectedPage: InspectedPage) {
      await openSourceCodeEditorForFile(fileName, 'click-breakpoint.html', devToolsPage, inspectedPage);

      for (const location of expectedLocations) {
        await addBreakpointForLine(location, devToolsPage);
      }

      await devToolsPage.waitForMany(BREAKPOINT_ITEM_SELECTOR, 3);
    }

    it('shows the correct location', async ({devToolsPage, inspectedPage}) => {
      await setupBreakpoints(devToolsPage, inspectedPage);
      for (let i = 0; i < expectedLocations.length; ++i) {
        const selector = `${BREAKPOINT_ITEM_SELECTOR}:nth-of-type(${i + 1})`;
        await checkLineNumber(selector, expectedLocations[i], devToolsPage);
      }
    });

    it('shows the correct file name', async ({devToolsPage, inspectedPage}) => {
      await setupBreakpoints(devToolsPage, inspectedPage);
      await checkFileGroupName(fileName, devToolsPage);
    });

    it('shows the correct code snippets', async ({devToolsPage, inspectedPage}) => {
      await setupBreakpoints(devToolsPage, inspectedPage);
      const breakpointItems = await devToolsPage.waitForMany(BREAKPOINT_ITEM_SELECTOR, 3);
      const actualCodeSnippets = await Promise.all(breakpointItems.map(async breakpoint => {
        const codeSnippetHandle = await devToolsPage.waitFor(CODE_SNIPPET_SELECTOR, breakpoint);
        const content = await extractTextContentIfConnected(codeSnippetHandle);
        assertNotNullOrUndefined(content);
        return content;
      }));

      const sourceContent = await retrieveCodeMirrorEditorContent(devToolsPage);
      const expectedCodeSnippets = expectedLocations.map(line => sourceContent[line - 1]);

      assert.deepEqual(actualCodeSnippets, expectedCodeSnippets);
    });
  });

  describe('for wasm files', () => {
    it('shows the correct code snippets', async ({devToolsPage, inspectedPage}) => {
      await openSourceCodeEditorForFile('memory.wasm', 'wasm/memory.html', devToolsPage, inspectedPage);
      await addBreakpointForLine('0x037', devToolsPage);

      const codeSnippetHandle = await devToolsPage.waitFor(`${BREAKPOINT_ITEM_SELECTOR} ${CODE_SNIPPET_SELECTOR}`);
      const actualCodeSnippet = await extractTextContentIfConnected(codeSnippetHandle);

      const sourceContent = await retrieveCodeMirrorEditorContent(devToolsPage);

      const expectedCodeSnippet = sourceContent[3];
      assert.strictEqual(actualCodeSnippet, expectedCodeSnippet);
    });
  });

  it('will keep the focus on breakpoint items whose location has changed after disabling',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(
           'breakpoint-on-comment.js', 'breakpoint-on-comment.html', devToolsPage, inspectedPage);

       // Set a breakpoint on a comment and expect it to slide.
       const originalBreakpointLine = 3;
       const slidBreakpointLine = 5;
       const breakpointLine = await getLineNumberElement(originalBreakpointLine, devToolsPage);
       assertNotNullOrUndefined(breakpointLine);
       await devToolsPage.clickElement(breakpointLine);
       await devToolsPage.waitForFunction(async () => await isBreakpointSet(slidBreakpointLine, devToolsPage));

       const breakpointView = await devToolsPage.$(BREAKPOINT_VIEW_COMPONENT);
       assertNotNullOrUndefined(breakpointView);

       // Click on the first breakpoint item to 1. disable and 2. focus.
       const breakpointItem = await devToolsPage.waitFor(FIRST_BREAKPOINT_ITEM_SELECTOR, breakpointView);
       assertNotNullOrUndefined(breakpointItem);

       const checkbox = await breakpointItem.$('input');
       assertNotNullOrUndefined(checkbox);
       await devToolsPage.clickElement(checkbox);

       // Wait until the click has propagated: the line is updated with the new location.
       await devToolsPage.waitForFunction(async () => await isBreakpointSet(originalBreakpointLine, devToolsPage));
       let breakpointItemTextContent: string|null = null;
       await devToolsPage.waitForFunction(async () => {
         const updatedBreakpointItem = await devToolsPage.waitFor(FIRST_BREAKPOINT_ITEM_SELECTOR, breakpointView);
         breakpointItemTextContent = await extractTextContentIfConnected(updatedBreakpointItem);
         const location = await devToolsPage.waitFor(LOCATION_SELECTOR, updatedBreakpointItem);
         const locationString = await extractTextContentIfConnected(location);
         return locationString === `${originalBreakpointLine}`;
       });

       // Check that the breakpoint item still has focus although the ui location has changed.
       const focusedTextContent = await devToolsPage.activeElementTextContent();
       assert.strictEqual(focusedTextContent, breakpointItemTextContent);
     });
});

async function checkFileGroupName(expectedFileName: string, devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const titleHandle = await devToolsPage.waitFor(GROUP_HEADER_TITLE_SELECTOR);
    const actualFileName = await extractTextContentIfConnected(titleHandle);
    return actualFileName && isEqualOrAbbreviation(actualFileName, expectedFileName);
  });
}

async function checkLineNumber(breakpointItemSelector: string, expectedLineNumber: number, devToolsPage: DevToolsPage) {
  await devToolsPage.waitForFunction(async () => {
    const breakpointItem = await devToolsPage.waitFor(breakpointItemSelector);
    const locationHandle = await devToolsPage.waitFor(LOCATION_SELECTOR, breakpointItem);
    const content = await extractTextContentIfConnected(locationHandle);
    return content && expectedLineNumber === parseInt(content, 10);
  });
}
