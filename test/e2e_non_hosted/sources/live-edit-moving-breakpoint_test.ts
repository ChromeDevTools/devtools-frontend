// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {
  addBreakpointForLine,
  isBreakpointSet,
  openSourceCodeEditorForFile,
  reloadPageAndWaitForSourceFile,
} from '../../e2e/helpers/sources-helpers.js';
import {
  step,
} from '../../shared/helper.js';

describe('Live edit', () => {
  it('moves the breakpoint after reload when changes are not persisted', async ({devToolsPage, inspectedPage}) => {
    await openSourceCodeEditorForFile(
        'live-edit-moving-breakpoint.js', 'live-edit-moving-breakpoint.html', devToolsPage, inspectedPage);

    await step('add two newlines to the script', async () => {
      const editorContent = await devToolsPage.waitFor('.cm-content');
      // Place the caret at the end of the marker line by clicking in the middle of the
      // line element and then pressing 'End'.
      await devToolsPage.click('pierceShadowText/// Insertion marker for newline.', {
        root: editorContent,
      });
      await devToolsPage.pressKey('End');

      await devToolsPage.pressKey('Enter');
      await devToolsPage.pressKey('Enter');
    });

    await step('save the script and wait for the save to go through', async () => {
      await devToolsPage.pressKey('s', {control: true});
      await devToolsPage.waitFor('[aria-label="live-edit-moving-breakpoint.js"]');
    });

    await step('set a breakpoint in the "await" line', async () => {
      await addBreakpointForLine(9, devToolsPage);
    });

    await step('reload the page and verify that the breakpoint has moved', async () => {
      await reloadPageAndWaitForSourceFile('live-edit-moving-breakpoint.js', devToolsPage, inspectedPage);
      await openSourceCodeEditorForFile(
          'live-edit-moving-breakpoint.js', 'live-edit-moving-breakpoint.html', devToolsPage, inspectedPage);

      assert.isFalse(await isBreakpointSet(9, devToolsPage));
      assert.isTrue(await isBreakpointSet(7, devToolsPage));
    });
  });
});
