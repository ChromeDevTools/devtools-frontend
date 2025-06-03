// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {openSourcesPanel, toggleDebuggerSidebar} from '../../e2e/helpers/sources-helpers.js';

describe('The Sources panel', () => {
  describe('contains a debugger sidebar', () => {
    it('which can be toggled via Ctrl+Shift+H shortcut keyboard', async ({devToolsPage}) => {
      await openSourcesPanel(devToolsPage);
      // Make sure that the debug sidebar is not collapsed in initial state
      await devToolsPage.waitFor('.scripts-debug-toolbar');
      //  Collapse debug sidebar
      await toggleDebuggerSidebar(devToolsPage.page);
      await devToolsPage.waitForNone('.scripts-debug-toolbar');
      // Expand debug sidebar
      await toggleDebuggerSidebar(devToolsPage.page);
      await devToolsPage.waitFor('.scripts-debug-toolbar');
    });
  });
});
