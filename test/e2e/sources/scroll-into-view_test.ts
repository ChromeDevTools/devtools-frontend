// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  $,
  click,
  disableExperiment,
  getBrowserAndPages,
  waitFor,
  waitForFunction,
} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {openSourceCodeEditorForFile, PAUSE_INDICATOR_SELECTOR, RESUME_BUTTON} from '../helpers/sources-helpers.js';

describe('The Sources tab', async () => {
  it('should also scroll horizontally when stopping', async () => {
    const {target} = getBrowserAndPages();

    // We need to disable the automatic pretty printing
    // so that we can check whether the Sources panel
    // correctly scrolls horizontally upon stopping.
    await disableExperiment('sourcesPrettyPrint');

    await openSourceCodeEditorForFile('scroll-into-view.js', 'scroll-into-view.html');

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
