// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {click, getBrowserAndPages, waitFor} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  addBreakpointForLine,
  createNewSnippet,
  executionLineHighlighted,
  getBreakpointDecorators,
  getOpenSources,
  openSnippetsSubPane,
  openSourcesPanel,
  PAUSE_BUTTON,
  RESUME_BUTTON,
} from '../helpers/sources-helpers.js';

describe('Snippets subpane', () => {
  it('can stop on breakpoints', async () => {
    const snippetName = 'Script snippet #7';
    const {frontend} = getBrowserAndPages();

    await openSourcesPanel();
    await openSnippetsSubPane();
    await createNewSnippet(snippetName, 'console.log(1);\nconsole.log(2);\nconsole.log(3);\n');

    assert.deepEqual(await getOpenSources(), [snippetName]);

    await addBreakpointForLine(frontend, 2);
    let decorators = await getBreakpointDecorators();
    assert.deepEqual(decorators, [2]);

    await click('[aria-label="Run snippet"]');

    // We stop on the breakpoint
    await waitFor(RESUME_BUTTON);

    await executionLineHighlighted();

    // The breakpoint is still visible
    decorators = await getBreakpointDecorators();
    assert.deepEqual(decorators, [2]);
    assert.deepEqual(await getOpenSources(), [snippetName]);

    await click(RESUME_BUTTON);
    await waitFor(PAUSE_BUTTON);
  });
});
