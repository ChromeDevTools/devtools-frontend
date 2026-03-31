// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {doubleRaf, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {html, render} from '../../ui/lit/lit.js';

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
    const activeElement = UI.DOMUtilities.deepActiveElement(document);
    if (activeElement) {
      activeElement.dispatchEvent(new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true}));
    }
  };

  const getFocusedElementText = () => {
    const activeElement = UI.DOMUtilities.deepActiveElement(document);
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

describeWithEnvironment('TabbedPaneElement', () => {
  it('creates tabs from slot elements', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="Tab 1">Content 1</div>
        <div id="tab2" title="Tab 2">Content 2</div>
      </devtools-tabbed-pane>
    `,
        container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    assert.isNotNull(tabbedPaneElement);
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    assert.isNotNull(widget);

    await raf();  // Wait for slotchange and updateTabs

    assert.lengthOf(widget.tabs, 2);
    assert.strictEqual(widget.tabs[0].id, 'tab1');
    assert.strictEqual(widget.tabs[0].title, 'Tab 1');
    assert.strictEqual(widget.tabs[1].id, 'tab2');
    assert.strictEqual(widget.tabs[1].title, 'Tab 2');
  });

  it('creates tabs with selected and disabled attributes', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="Tab 1" disabled>Content 1</div>
        <div id="tab2" title="Tab 2" selected>Content 2</div>
      </devtools-tabbed-pane>
    `,
        container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    assert.isNotNull(tabbedPaneElement);
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    assert.isNotNull(widget);

    await raf();  // Wait for slotchange and updateTabs

    assert.lengthOf(widget.tabs, 2);
    assert.isFalse(widget.tabIsEnabled('tab1'));
    assert.isTrue(widget.tabIsEnabled('tab2'));
    assert.strictEqual(widget.selectedTabId, 'tab2');
  });

  it('creates tabs with jslogcontext', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="Tab 1" jslogcontext="log1">Content 1</div>
      </devtools-tabbed-pane>
    `,
        container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    assert.isNotNull(tabbedPaneElement);
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    assert.isNotNull(widget);

    await raf();

    assert.strictEqual(widget.tabs[0].jslogContext, 'log1');
  });

  it('updates tabs when attributes change', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="Tab 1">Content 1</div>
      </devtools-tabbed-pane>
    `,
        container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    await raf();

    const tabElement = container.querySelector('#tab1') as HTMLElement;
    tabElement.setAttribute('title', 'Updated Tab 1');

    // MutationObserver needs a tick
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.strictEqual(widget.tabs[0].title, 'Updated Tab 1');
  });

  it('updates tabs when jslogcontext attribute changes', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="Tab 1">Content 1</div>
      </devtools-tabbed-pane>
    `,
        container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    await raf();

    const tabElement = container.querySelector('#tab1') as HTMLElement;
    tabElement.setAttribute('jslogcontext', 'updated-log');

    // MutationObserver needs a tick
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.strictEqual(widget.tabs[0].jslogContext, 'updated-log');
  });

  it('updates tabs when selected attribute changes', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="Tab 1">Content 1</div>
        <div id="tab2" title="Tab 2">Content 2</div>
      </devtools-tabbed-pane>
    `,
        container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    await raf();

    assert.strictEqual(widget.selectedTabId, 'tab1');

    const tab2 = container.querySelector('#tab2') as HTMLElement;
    tab2.setAttribute('selected', '');

    // MutationObserver needs a tick
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.strictEqual(widget.selectedTabId, 'tab2');
  });

  it('updates tabs when disabled attribute changes', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="Tab 1">Content 1</div>
        <div id="tab2" title="Tab 2">Content 2</div>
      </devtools-tabbed-pane>
    `,
        container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    await raf();

    assert.isTrue(widget.tabIsEnabled('tab2'));

    const tab2 = container.querySelector('#tab2') as HTMLElement;
    tab2.setAttribute('disabled', '');

    // MutationObserver needs a tick
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.isFalse(widget.tabIsEnabled('tab2'));
  });

  it('updates tabs when children are added or removed', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="Tab 1">Content 1</div>
      </devtools-tabbed-pane>
    `,
        container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    await raf();

    assert.lengthOf(widget.tabs, 1);

    // Add a new tab
    const newTab = document.createElement('div');
    newTab.id = 'tab2';
    newTab.setAttribute('title', 'Tab 2');
    tabbedPaneElement.appendChild(newTab);

    await raf();  // wait for slotchange

    assert.lengthOf(widget.tabs, 2);
    assert.strictEqual(widget.tabs[1].id, 'tab2');

    // Remove the first tab
    const tab1 = container.querySelector('#tab1') as HTMLElement;
    tab1.remove();

    await raf();

    assert.lengthOf(widget.tabs, 1);
    assert.strictEqual(widget.tabs[0].id, 'tab2');
  });

  it('supports left and right toolbars via slots', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <devtools-toolbar slot="left" id="left-toolbar"></devtools-toolbar>
        <devtools-toolbar slot="right" id="right-toolbar"></devtools-toolbar>
      </devtools-tabbed-pane>
    `,
        container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    await raf();

    const leftToolbar = container.querySelector('#left-toolbar');
    const rightToolbar = container.querySelector('#right-toolbar');

    assert.strictEqual(widget.leftToolbar(), leftToolbar);
    assert.strictEqual(widget.rightToolbar(), rightToolbar);
  });
});
