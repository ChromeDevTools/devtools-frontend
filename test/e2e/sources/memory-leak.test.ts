// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {focusConsolePrompt} from '../helpers/console-helpers.js';
import {
  getOpenSources,
  openSourceCodeEditorForFile,
  SourceFileEvents,
  waitForSourceFiles,
} from '../helpers/sources-helpers.js';

describe('The Sources panel', () => {
  it('does not retain UISourceCodes of the previous page after navigation', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(devToolsPage, inspectedPage, 'popover.js', 'popover.html');

    await waitForSourceFiles(devToolsPage, SourceFileEvents.ADDED_TO_SOURCE_TREE,
                             files => files.some(f => f.endsWith('empty.html')),
                             () => inspectedPage.goToResource('empty.html'));
    await devToolsPage.waitForFunction(async () => (await getOpenSources(devToolsPage)).length === 0);
    // CodeMirror caches the Range it last used for measuring text at module level, which keeps the last
    // measured (already destroyed) editor alive. Type into the console prompt to make it measure elsewhere.
    // Don't open another source file for this, as it would also mask "last revealed file" retainers.
    await devToolsPage.pressKey('Escape');
    await focusConsolePrompt(devToolsPage);
    await devToolsPage.typeText('1');

    await devToolsPage.collectGarbage();

    const prototype = await devToolsPage.page.evaluateHandle(`(async () => {
      const Workspace = await import('./models/workspace/workspace.js');
      return Workspace.UISourceCode.UISourceCode.prototype;
    })()`);
    const instances = await devToolsPage.page.queryObjects(prototype);
    const urls = await instances.evaluate(
        instances => (instances as Array<{url(): string}>).map(uiSourceCode => uiSourceCode.url()));
    await instances.dispose();
    await prototype.dispose();

    assert.deepEqual(urls.filter(url => url.includes('/popover.')), []);
  });
});
