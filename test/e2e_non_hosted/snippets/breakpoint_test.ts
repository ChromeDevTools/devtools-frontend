// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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
} from '../../e2e/helpers/sources-helpers.js';

describe('Snippets subpane', () => {
  it('can stop on breakpoints', async ({devToolsPage}) => {
    const snippetName = 'Script snippet #7';

    await openSourcesPanel(devToolsPage);
    await openSnippetsSubPane(devToolsPage);
    await createNewSnippet(snippetName, 'console.log(1);\nconsole.log(2);\nconsole.log(3);\n', devToolsPage);

    assert.deepEqual(await getOpenSources(devToolsPage), [snippetName]);

    await addBreakpointForLine(2, devToolsPage);
    let decorators = await getBreakpointDecorators(false, 1, devToolsPage);
    assert.deepEqual(decorators, [2]);

    await devToolsPage.click('[aria-label="Run snippet"]');

    // We stop on the breakpoint
    await devToolsPage.waitFor(RESUME_BUTTON);

    await executionLineHighlighted(devToolsPage);

    // The breakpoint is still visible
    decorators = await getBreakpointDecorators(false, 1, devToolsPage);
    assert.deepEqual(decorators, [2]);
    assert.deepEqual(await getOpenSources(devToolsPage), [snippetName]);

    await devToolsPage.click(RESUME_BUTTON);
    await devToolsPage.waitFor(PAUSE_BUTTON);
  });
});
