// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  click,
  getBrowserAndPages,
  step,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';

import {
  addBreakpointForLine,
  disableInlineBreakpointForLine,
  enableInlineBreakpointForLine,
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON,
} from '../helpers/sources-helpers.js';

// These tests are ported from the web test:
// https://crsrc.org/c/third_party/blink/web_tests/http/tests/devtools/sources/debugger/source-frame-inline-breakpoint-decorations.js;drc=74dacd13f4b89f64ebe1aa99d4b5d80480a8d3b4
describe('The Sources Tab', () => {
  beforeEach(async () => {
    await openSourceCodeEditorForFile('breakpoint-decorations.js', 'breakpoint-decorations.html');
  });

  /**
   * @param line 1-based line number
   * @returns the text of the line but for every inline breakpoint decorator we add a '@' or '%' for
   *          enabled or disabled breakpoints respectively.
   */
  async function getLineDecorationDescriptor(line: number): Promise<string> {
    const {frontend} = getBrowserAndPages();
    return frontend.$eval(
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

  async function checkLineDecorationDescriptor(line: number, expected: string): Promise<void> {
    await waitForFunction(async () => {
      return await getLineDecorationDescriptor(line) === expected;
    });
  }

  it('shows inline decorations when setting a breakpoint on a line with multiple locations', async () => {
    const {frontend} = getBrowserAndPages();
    await addBreakpointForLine(frontend, 3);

    await checkLineDecorationDescriptor(3, '    var p = @Promise.%resolve().%then(() => console.%log(42)%)');
  });

  it('shows no inline decorations when setting a breakpoint on a line with a single location', async () => {
    const {frontend} = getBrowserAndPages();
    await addBreakpointForLine(frontend, 5);

    await checkLineDecorationDescriptor(5, '    return p;');
  });

  it('removes the breakpoint when the last inline breakpoint is disabled', async () => {
    const {frontend} = getBrowserAndPages();
    await addBreakpointForLine(frontend, 3);
    await checkLineDecorationDescriptor(3, '    var p = @Promise.%resolve().%then(() => console.%log(42)%)');

    await disableInlineBreakpointForLine(3, 1, true);
    await checkLineDecorationDescriptor(3, '    var p = Promise.resolve().then(() => console.log(42))');
  });

  it('can enable/disable inline breakpoints by clicking on the decorations', async () => {
    const {frontend} = getBrowserAndPages();
    await addBreakpointForLine(frontend, 3);

    await step('click the second inline breakpoint', async () => {
      await checkLineDecorationDescriptor(3, '    var p = @Promise.%resolve().%then(() => console.%log(42)%)');

      await enableInlineBreakpointForLine(3, 2);

      await checkLineDecorationDescriptor(3, '    var p = @Promise.@resolve().%then(() => console.%log(42)%)');
    });

    await step('click the first inline breakpoint', async () => {
      await disableInlineBreakpointForLine(3, 1);

      await checkLineDecorationDescriptor(3, '    var p = %Promise.@resolve().%then(() => console.%log(42)%)');
    });
  });

  it('chooses inline pause location when setting a breakpoint on that line', async () => {
    const {frontend, target} = await getBrowserAndPages();
    const donePromise = target.evaluate('pauseInline();');
    await waitFor(PAUSE_INDICATOR_SELECTOR);
    await addBreakpointForLine(frontend, 10);
    await checkLineDecorationDescriptor(10, '    %return Promise.%resolve().%then(()=>{ @debugger; %});');
    await click(RESUME_BUTTON);
    await donePromise;
  });
});
