// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {getBrowserAndPages, waitFor, waitForNone} from '../../shared/helper.js';

import {openSourcesPanel, toggleDebuggerSidebar} from '../helpers/sources-helpers.js';

describe('The Sources panel', () => {
  describe('contains a debugger sidebar', () => {
    it('which can be toggled via Ctrl+Shift+H shortcut keyboard', async () => {
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
