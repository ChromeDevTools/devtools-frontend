// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {getBrowserAndPages, waitFor, waitForNone} from '../../shared/helper.js';
import {describe, it} from '../../shared/mocha-extensions.js';
import {
  addBreakpointForLine,
  clickOnContextMenu,
  openEditBreakpointDialog,
  openFileInEditor,
  openSourceCodeEditorForFile,
  openSourcesPanel,
  scrollByInEditor,
  toggleDebuggerSidebar,
  toggleNavigatorSidebar,
  waitForScrollPositionInEditor,
} from '../helpers/sources-helpers.js';

describe('The Sources Tab', async () => {
  describe('Navigation', () => {
    it('should show a "search in folder" option in the context menu of folders', async () => {
      await openSourceCodeEditorForFile('index.html', 'navigation/index.html');

      await clickOnContextMenu('[aria-label="test/e2e/resources/sources/navigation, nw-folder"]', 'Search in folder');
      const element = await waitFor('[aria-label="Search Query"]');
      const value = await element.evaluate(input => (input as HTMLInputElement).value);

      assert.strictEqual(value, 'file:test/e2e/resources/sources/navigation');
    });
  });

  describe('Scroll and navigation', async () => {
    it('after performing scrolls in an editor and navigating between different editor tabs should restore the correct scroll position',
       async () => {
         await openSourceCodeEditorForFile('tabbed-editor-scroll-position-1.js', 'tabbed-editor-scroll-position.html');

         await scrollByInEditor({x: 15, y: 15});
         await scrollByInEditor({x: 15, y: 15});
         await openFileInEditor('tabbed-editor-scroll-position-2.js');
         await openFileInEditor('tabbed-editor-scroll-position-1.js');

         await waitForScrollPositionInEditor({scrollLeft: 30, scrollTop: 30});
       });

    it('scroll position doesn\'t change when edit breakpoint dialog is opened', async () => {
      const {frontend} = getBrowserAndPages();
      await openSourceCodeEditorForFile('tabbed-editor-scroll-position-1.js', 'tabbed-editor-scroll-position.html');

      await scrollByInEditor({x: 15, y: 15});

      await addBreakpointForLine(frontend, 5);
      await openEditBreakpointDialog(frontend, 5);

      await waitForScrollPositionInEditor({scrollLeft: 15, scrollTop: 15});
    });
  });

  describe('Sidebar shortcuts', () => {
    it('should Ctrl + Shift + Y shortcut toggle navigator sidebar', async () => {
      const {frontend} = getBrowserAndPages();
      await openSourcesPanel();
      // Make sure that the navigator sidebar is not collapsed in initial state
      await waitFor('.navigator-tabbed-pane');
      // Collapse navigator sidebar
      await toggleNavigatorSidebar(frontend);
      await waitForNone('.navigator-tabbed-pane');
      // Expand navigator sidebar
      await toggleNavigatorSidebar(frontend);
      await waitFor('.navigator-tabbed-pane');
    });

    it('should Ctrl + Shift + H shortcut toggle debug sidebar', async () => {
      const {frontend} = getBrowserAndPages();
      await openSourcesPanel();
      // Make sure that the debug sidebar is not collapsed in initial state
      await waitFor('.scripts-debug-toolbar');
      //  Collapse debug sidebar
      await toggleDebuggerSidebar(frontend);
      await waitForNone('.scripts-debug-toolbar');
      // Expand debug sidebar
      await toggleDebuggerSidebar(frontend);
      await waitFor('.scripts-debug-toolbar');
    });
  });
});
