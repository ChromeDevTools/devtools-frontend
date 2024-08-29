// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$, click, getBrowserAndPages, waitFor, waitForFunction, waitForNone} from '../../shared/helper.js';

import {openSourceCodeEditorForFile, PAUSE_INDICATOR_SELECTOR, RESUME_BUTTON} from '../helpers/sources-helpers.js';

const PRETTY_PRINT_BUTTON = '[aria-label="Pretty print"]';
const PRETTY_PRINTED_TOGGLE = 'devtools-text-editor.pretty-printed';

describe('The Sources tab', () => {
  it('should also scroll horizontally when stopping', async () => {
    const {target} = getBrowserAndPages();

    await openSourceCodeEditorForFile('scroll-into-view.js', 'scroll-into-view.html');

    // We need to disable the pretty printing, so that
    // we can check whether the Sources panel correctly
    // scrolls horizontally upon stopping.
    await waitFor(PRETTY_PRINTED_TOGGLE);
    await Promise.all([
      click(PRETTY_PRINT_BUTTON),
      waitForNone(PRETTY_PRINTED_TOGGLE),
    ]);

    const scriptEvaluation = target.evaluate('funcWithLongLines()');

    await waitFor(PAUSE_INDICATOR_SELECTOR);

    const scrollLeft = await waitForFunction(async () => {
      const scroller = await $('.cm-editor > .cm-scroller');
      return await scroller.evaluate(e => e.scrollLeft);
    });
    assert.isAbove(scrollLeft, 0);

    await Promise.all([
      click(RESUME_BUTTON),
      scriptEvaluation,
    ]);
  });
});
