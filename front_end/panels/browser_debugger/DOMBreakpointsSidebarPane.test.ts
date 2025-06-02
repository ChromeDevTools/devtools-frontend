// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithLocale} from '../../testing/EnvironmentHelpers.js';

import * as BrowserDebugger from './browser_debugger.js';

describeWithLocale('DOMBreakpointsSidebarPane placeholder', () => {
  function assertElementDisplayStyle(selector: string, style: string) {
    const element =
        BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane.instance().contentElement.querySelector(
            selector);
    assert.exists(element);
    assert.deepEqual(window.getComputedStyle(element).display, style);
  }

  it('shows one-liner if in sources', () => {
    const domBreakpointsSidebarPane = BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane.instance();
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    container.classList.add('sources', 'panel');
    domBreakpointsSidebarPane.markAsRoot();
    domBreakpointsSidebarPane.show(container);

    assertElementDisplayStyle('.empty-view-scroller', 'none');
    assertElementDisplayStyle('.placeholder .gray-info-message', 'block');

    assert.deepEqual(
        domBreakpointsSidebarPane.contentElement.querySelector('.placeholder .gray-info-message')?.textContent,
        'No DOM breakpoints');
  });

  it('shows empty widget if in elements panel', () => {
    const domBreakpointsSidebarPane = BrowserDebugger.DOMBreakpointsSidebarPane.DOMBreakpointsSidebarPane.instance();
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    container.classList.add('elements', 'panel');
    domBreakpointsSidebarPane.markAsRoot();
    domBreakpointsSidebarPane.show(container);
    assertElementDisplayStyle('.empty-view-scroller', 'flex');
    assertElementDisplayStyle('.placeholder .gray-info-message', 'none');

    assert.deepEqual(
        domBreakpointsSidebarPane.contentElement.querySelector('.empty-state-header')?.textContent,
        'No DOM breakpoints');
    assert.deepEqual(
        domBreakpointsSidebarPane.contentElement.querySelector('.empty-state-description > span')?.textContent,
        'DOM breakpoints pause on the code that changes a DOM node or its children.');
  });
});
