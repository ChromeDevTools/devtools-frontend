// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  addBreakpointForLine,
  disableInlineBreakpointForLine,
  enableInlineBreakpointForLine,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
} from '../../e2e/helpers/sources-helpers.js';
import type {DevToolsPage} from '../../e2e_non_hosted/shared/frontend-helper.js';
import {
  step,
} from '../../shared/helper.js';

// These tests are ported from the web test:
// https://crsrc.org/c/third_party/blink/web_tests/http/tests/devtools/sources/debugger/source-frame-inline-breakpoint-decorations.js;drc=74dacd13f4b89f64ebe1aa99d4b5d80480a8d3b4
describe('The Sources Tab', () => {
  /**
   * @param line 1-based line number
   * @returns the text of the line but for every inline breakpoint decorator we add a '@' or '%' for
   *          enabled or disabled breakpoints respectively.
   */
  async function getLineDecorationDescriptor(line: number, devToolsPage: DevToolsPage): Promise<string> {
    return await devToolsPage.page.$eval(
        `pierce/.cm-content > :nth-child(${line})`,
        contentEl => [...contentEl.childNodes]
                         .map(lineSegment => {
                           if (lineSegment instanceof HTMLElement &&
                               lineSegment.classList.contains('cm-inlineBreakpoint')) {
                             return lineSegment.classList.contains('cm-inlineBreakpoint-disabled') ? '%' : '@';
                           }
                           return lineSegment.textContent;
                         })
                         .join(''));
  }

  async function checkLineDecorationDescriptor(
      line: number, expected: string, devToolsPage: DevToolsPage): Promise<void> {
    await devToolsPage.waitForFunction(async () => {
      return await getLineDecorationDescriptor(line, devToolsPage) === expected;
    });
  }

  it('shows inline decorations when setting a breakpoint on a line with multiple locations',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(
           'breakpoint-decorations.js', 'breakpoint-decorations.html', devToolsPage, inspectedPage);
       await addBreakpointForLine(3, devToolsPage);

       await checkLineDecorationDescriptor(
           3, '    var p = @Promise.%resolve().%then(() => console.%log(42)%)', devToolsPage);
     });

  it('shows no inline decorations when setting a breakpoint on a line with a single location',
     async ({devToolsPage, inspectedPage}) => {
       await openSourceCodeEditorForFile(
           'breakpoint-decorations.js', 'breakpoint-decorations.html', devToolsPage, inspectedPage);
       await addBreakpointForLine(5, devToolsPage);

       await checkLineDecorationDescriptor(5, '    return p;', devToolsPage);
     });

  it('removes the breakpoint when the last inline breakpoint is disabled', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'breakpoint-decorations.js', 'breakpoint-decorations.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(3, devToolsPage);
    await checkLineDecorationDescriptor(
        3, '    var p = @Promise.%resolve().%then(() => console.%log(42)%)', devToolsPage);

    await disableInlineBreakpointForLine(3, 1, true, devToolsPage);
    await checkLineDecorationDescriptor(3, '    var p = Promise.resolve().then(() => console.log(42))', devToolsPage);
  });

  it('can enable/disable inline breakpoints by clicking on the decorations', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'breakpoint-decorations.js', 'breakpoint-decorations.html', devToolsPage, inspectedPage);
    await addBreakpointForLine(3, devToolsPage);

    await step('click the second inline breakpoint', async () => {
      await checkLineDecorationDescriptor(
          3, '    var p = @Promise.%resolve().%then(() => console.%log(42)%)', devToolsPage);

      await enableInlineBreakpointForLine(3, 2, devToolsPage);

      await checkLineDecorationDescriptor(
          3, '    var p = @Promise.@resolve().%then(() => console.%log(42)%)', devToolsPage);
    });

    await step('click the first inline breakpoint', async () => {
      await disableInlineBreakpointForLine(3, 1, false, devToolsPage);

      await checkLineDecorationDescriptor(
          3, '    var p = %Promise.@resolve().%then(() => console.%log(42)%)', devToolsPage);
    });
  });

  it('chooses inline pause location when setting a breakpoint on that line', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'breakpoint-decorations.js', 'breakpoint-decorations.html', devToolsPage, inspectedPage);
    const donePromise = inspectedPage.evaluate('pauseInline();');
    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);
    await addBreakpointForLine(10, devToolsPage);
    await checkLineDecorationDescriptor(10, '    %return Promise.%resolve().%then(()=>{ @debugger; %});', devToolsPage);
    await devToolsPage.click(RESUME_BUTTON);
    await donePromise;
  });
});
