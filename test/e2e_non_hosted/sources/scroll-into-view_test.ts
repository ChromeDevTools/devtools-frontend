// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  openSourceCodeEditorForFile,
  PAUSE_INDICATOR_SELECTOR,
  RESUME_BUTTON
} from '../../e2e/helpers/sources-helpers.js';

const PRETTY_PRINT_BUTTON = '[aria-label="Pretty print"]';
const PRETTY_PRINTED_TOGGLE = 'devtools-text-editor.pretty-printed';

describe('The Sources tab', () => {
  it('should also scroll horizontally when stopping', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile('scroll-into-view.js', 'scroll-into-view.html', devToolsPage, inspectedPage);

    // We need to disable the pretty printing, so that
    // we can check whether the Sources panel correctly
    // scrolls horizontally upon stopping.
    await devToolsPage.waitFor(PRETTY_PRINTED_TOGGLE);
    await Promise.all([
      devToolsPage.click(PRETTY_PRINT_BUTTON),
      devToolsPage.waitForNone(PRETTY_PRINTED_TOGGLE),
    ]);

    const scriptEvaluation = inspectedPage.evaluate('funcWithLongLines()');

    await devToolsPage.waitFor(PAUSE_INDICATOR_SELECTOR);

    const scrollLeft = await devToolsPage.waitForFunction(async () => {
      const scroller = await devToolsPage.$('.cm-editor > .cm-scroller');
      return await scroller.evaluate(e => e.scrollLeft);
    });
    assert.isAbove(scrollLeft, 0);

    await Promise.all([
      devToolsPage.click(RESUME_BUTTON),
      scriptEvaluation,
    ]);
  });
});
