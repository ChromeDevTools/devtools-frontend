// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Sources from '../../../../../front_end/panels/sources/sources.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';

describeWithEnvironment('BreakpointsSidebarPane', () => {
  it('renders an empty breakpoints info message', () => {
    const breakpointSidebar = Sources.BreakpointsSidebarPane.BreakpointsSidebarPane.instance();
    const message = breakpointSidebar.contentElement.innerText;
    assert.strictEqual(message, 'No breakpoints');
  });
});
