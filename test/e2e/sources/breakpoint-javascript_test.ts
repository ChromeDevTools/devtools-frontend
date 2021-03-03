// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {$, click, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {addBreakpointForLine, openSourceCodeEditorForFile, RESUME_BUTTON, retrieveTopCallFrameWithoutResuming} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  it('sets and hits breakpoints in JavaScript', async () => {
    const {target, frontend} = getBrowserAndPages();
    await openSourceCodeEditorForFile('click-breakpoint.js', 'click-breakpoint.html');
    await addBreakpointForLine(frontend, 4);

    const scriptEvaluation = target.evaluate('f2();');

    const scriptLocation = await retrieveTopCallFrameWithoutResuming();
    assert.deepEqual(scriptLocation, 'click-breakpoint.js:4');

    const breakpointHandle = await $('label', await waitFor('.breakpoint-hit'));
    const breakpointLocation = await breakpointHandle?.evaluate(label => label.textContent);
    assert.deepEqual(breakpointLocation, scriptLocation);

    await click(RESUME_BUTTON);
    await scriptEvaluation;
  });
});
