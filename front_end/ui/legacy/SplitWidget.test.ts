// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithEnvironment('SplitWidget', () => {
  describe('toggling', () => {
    it('returns the open state of the sidebar', async () => {
      const widget = new UI.SplitWidget.SplitWidget(
          true,   // isVertical
          false,  // secondIsSidebar
      );
      widget.showBoth();

      // Sidebar is showing, so toggling it hides it.
      assert.isFalse(widget.toggleSidebar());

      // Now it toggles to make it visible again
      assert.isTrue(widget.toggleSidebar());
    });
  });
});
