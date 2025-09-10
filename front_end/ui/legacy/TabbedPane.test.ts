// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';
import {doubleRaf, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as UI from './legacy.js';

describeWithEnvironment('TabbedPane', () => {
  let tabbedPane: UI.TabbedPane.TabbedPane;

  /**
   * A simple widget class that can receive focus.
   */
  class FocusableWidget extends UI.Widget.Widget {
    constructor(name: string) {
      super();
      this.element.tabIndex = -1;  // Make it focusable
      this.element.textContent = name;
      this.setDefaultFocusedElement(this.element);
    }
  }

  /**
   * This hook runs before each test case (`it(...)`).
   * It sets up a new TabbedPane and populates it with 10 tabs.
   */
  beforeEach(async () => {
    tabbedPane = new UI.TabbedPane.TabbedPane();
    tabbedPane.markAsRoot();

    for (let i = 0; i < 10; i++) {
      tabbedPane.appendTab(i.toString(), `Tab ${i}`, new FocusableWidget(`Widget ${i}`));
    }
    renderElementIntoDOM(tabbedPane);
    await doubleRaf();
  });

  const dispatchKeyEvent = (key: string) => {
    const activeElement = Platform.DOMUtilities.deepActiveElement(document);
    if (activeElement) {
      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}));
    }
  };

  const getFocusedElementText = () => {
    const activeElement = Platform.DOMUtilities.deepActiveElement(document);
    return activeElement ? activeElement.textContent : null;
  };

  it('should navigate between tabs using arrow keys and wrap around', async () => {
    // Focus the first tab to start the test.
    tabbedPane.selectTab('0');
    tabbedPane.focusSelectedTabHeader();
    await raf();

    assert.strictEqual(getFocusedElementText(), 'Tab 0', 'Initial focus should be on Tab 0');

    // Move right to the next tab.
    dispatchKeyEvent('ArrowRight');
    assert.strictEqual(getFocusedElementText(), 'Tab 1', 'Focus should move to Tab 1');

    // Move to the last tab.
    for (let i = 2; i <= 9; i++) {
      dispatchKeyEvent('ArrowRight');
    }
    assert.strictEqual(getFocusedElementText(), 'Tab 9', 'Focus should be on the last tab');

    // Wrap around to the first tab when moving right from the last tab.
    dispatchKeyEvent('ArrowRight');
    assert.strictEqual(getFocusedElementText(), 'Tab 0', 'Focus should wrap around to Tab 0');

    // Wrap around to the last tab when moving left from the first tab.
    dispatchKeyEvent('ArrowLeft');
    assert.strictEqual(getFocusedElementText(), 'Tab 9', 'Focus should wrap around to Tab 9 on left arrow');
  });

  it('should focus the widget content when Enter is pressed on a tab', () => {
    // Start with the second tab focused.
    tabbedPane.selectTab('1');
    tabbedPane.focusSelectedTabHeader();
    assert.strictEqual(getFocusedElementText(), 'Tab 1', 'Initial focus should be on Tab 1');

    // Press 'Enter' to focus the widget inside the tab's view.
    dispatchKeyEvent('Enter');
    assert.strictEqual(getFocusedElementText(), 'Widget 1', 'Focus should move to Widget 1');

    // For the next step, manually re-focus the tab element, as the user would via Shift+Tab.
    tabbedPane.focusSelectedTabHeader();
    assert.strictEqual(getFocusedElementText(), 'Tab 1', 'Focus returned to Tab 1');

    // Move left to Tab 0.
    dispatchKeyEvent('ArrowLeft');
    assert.strictEqual(getFocusedElementText(), 'Tab 0', 'Focus should move to Tab 0');

    // Press 'Enter' to focus the widget in the first tab.
    dispatchKeyEvent('Enter');
    assert.strictEqual(getFocusedElementText(), 'Widget 0', 'Focus should move to Widget 0');
  });
});
