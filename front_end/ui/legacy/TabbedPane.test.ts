// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import {doubleRaf, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';

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

  it('places role="tab" on the focusable tab element, not on a child', () => {
    // The ARIA tabs pattern requires the focusable, selectable element to have
    // role="tab" as a direct child of role="tablist". Otherwise screen readers
    // announce the focused element by its container role (e.g. "group") instead
    // of "tab". See https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
    tabbedPane.selectTab('0');
    tabbedPane.focusSelectedTabHeader();

    const focused = UI.DOMUtilities.deepActiveElement(document) as HTMLElement;
    assert.strictEqual(focused.getAttribute('role'), 'tab');
    assert.strictEqual(focused.getAttribute('aria-selected'), 'true');
    assert.strictEqual(focused.getAttribute('aria-label'), 'Tab 0');
    assert.strictEqual((focused.parentElement as HTMLElement).getAttribute('role'), 'tablist');
    assert.isNull(focused.querySelector('[role="tab"]'), 'role="tab" should not also appear on a descendant element');
  });

  it('moveTab reorders the tab and dispatches TabOrderChanged', () => {
    const events: string[] = [];
    tabbedPane.addEventListener(
        UI.TabbedPane.Events.TabOrderChanged, (event: {data: {tabId: string}}) => events.push(event.data.tabId));

    tabbedPane.moveTab('5', 1);

    assert.deepEqual(tabbedPane.tabIds(), ['0', '5', '1', '2', '3', '4', '6', '7', '8', '9']);
    assert.deepEqual(events, ['5']);
  });

  it('moveTab places the tab at the requested final index when moving to a higher index', () => {
    // Regression test: `newIndex` is the final position. Move tab "1"
    // (originally at index 1) to final index 5; it must end up at
    // index 5, not at index 4 (which would be the result of an
    // off-by-one decrement after splice).
    tabbedPane.moveTab('1', 5);
    assert.deepEqual(tabbedPane.tabIds(), ['0', '2', '3', '4', '5', '1', '6', '7', '8', '9']);

    // Also exercise moving to the very last position.
    tabbedPane.moveTab('0', 9);
    assert.deepEqual(tabbedPane.tabIds(), ['2', '3', '4', '5', '1', '6', '7', '8', '9', '0']);
  });

  it('moveTab is a no-op when target equals current index', () => {
    const events: string[] = [];
    tabbedPane.addEventListener(
        UI.TabbedPane.Events.TabOrderChanged, (event: {data: {tabId: string}}) => events.push(event.data.tabId));
    const originalOrder = tabbedPane.tabIds();

    tabbedPane.moveTab('3', 3);

    assert.deepEqual(tabbedPane.tabIds(), originalOrder);
    assert.deepEqual(events, []);
  });

  it('moveTab reorders even for currently-detached (overflowed) tabs', () => {
    // Simulate overflow on tab "9" by detaching its tabElement and clearing
    // the `shown` flag — same end state as `hideTabElement`.
    const tab9 = tabbedPane.tabsById.get('9');
    assert.exists(tab9);
    tab9!.tabElement.remove();
    tab9!.shown = false;

    tabbedPane.moveTab('9', 0);
    assert.deepEqual(tabbedPane.tabIds(), ['9', '0', '1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('moveTab reorders the tab in the DOM when the moved tab is currently visible', async () => {
    tabbedPane.moveTab('7', 1);
    // DOM reordering is reconciled declaratively in the next update tick.
    await doubleRaf();

    // The internal model and the DOM order of visible tabs must agree.
    assert.deepEqual(tabbedPane.tabIds(), ['0', '7', '1', '2', '3', '4', '5', '6', '8', '9']);
    const domOrder = Array.from(tabbedPane.tabsElement.children).map(el => el.id.replace(/^tab-/, ''));
    assert.deepEqual(domOrder, ['0', '7', '1', '2', '3', '4', '5', '6', '8', '9']);
  });

  it('does not keep a reference to the last selected tab after it is closed', () => {
    tabbedPane.selectTab('9');
    assert.exists((tabbedPane as unknown as {lastSelectedOverflowTab?: unknown}).lastSelectedOverflowTab);

    tabbedPane.closeTabs(tabbedPane.tabIds());

    assert.isUndefined((tabbedPane as unknown as {lastSelectedOverflowTab?: unknown}).lastSelectedOverflowTab);
  });

  it('only listens to zoom changes while shown', () => {
    const zoomManager = UI.ZoomManager.ZoomManager.instance();
    assert.isTrue(zoomManager.hasEventListeners(UI.ZoomManager.Events.ZOOM_CHANGED));

    tabbedPane.detach();
    const hiddenTabbedPane = new UI.TabbedPane.TabbedPane();
    assert.isFalse(hiddenTabbedPane.isShowing());
    assert.isFalse(zoomManager.hasEventListeners(UI.ZoomManager.Events.ZOOM_CHANGED));

    renderElementIntoDOM(tabbedPane);
    assert.isTrue(zoomManager.hasEventListeners(UI.ZoomManager.Events.ZOOM_CHANGED));
  });

  it('re-measures the tabs when shown again', async () => {
    tabbedPane.detach();
    // The zoom factor might have changed while the pane was hidden.
    (tabbedPane as unknown as {measuredDropDownButtonWidth: number}).measuredDropDownButtonWidth = 999;

    renderElementIntoDOM(tabbedPane);
    await tabbedPane.updateComplete;

    assert.notStrictEqual((tabbedPane as unknown as {measuredDropDownButtonWidth?: number}).measuredDropDownButtonWidth,
                          999);
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

  it('creates tabs with label, tab-tooltip, and falls back to title', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(html`
      <devtools-tabbed-pane>
        <div id="tab1" label="Tab 1" tab-tooltip="Tooltip 1">Content 1</div>
        <div id="tab2" title="Fallback Tab 2">Content 2</div>
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
    assert.strictEqual(widget.tabs[0].tabTooltip, 'Tooltip 1');
    assert.strictEqual(widget.tabsById.get('tab1')?.tooltip, 'Tooltip 1');
    assert.strictEqual(
        widget.tabsById.get('tab1')?.tabElement.querySelector('.tabbed-pane-header-tab-title')?.getAttribute('title'),
        'Tooltip 1');
    assert.strictEqual(widget.tabs[1].id, 'tab2');
    assert.strictEqual(widget.tabs[1].title, 'Fallback Tab 2');
    assert.isUndefined(widget.tabs[1].tabTooltip);
    assert.isUndefined(widget.tabsById.get('tab2')?.tooltip);
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

  it('updates tabs when label and tab-tooltip attributes change', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(html`
      <devtools-tabbed-pane>
        <div id="tab1" label="Tab 1" tab-tooltip="Initial Tooltip">Content 1</div>
      </devtools-tabbed-pane>
    `,
           container);

    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    await raf();

    const tabElement = container.querySelector('#tab1') as HTMLElement;
    tabElement.setAttribute('label', 'Updated Tab 1');
    tabElement.setAttribute('tab-tooltip', 'Updated Tooltip');

    // MutationObserver needs a tick
    await new Promise(resolve => setTimeout(resolve, 0));

    assert.strictEqual(widget.tabs[0].title, 'Updated Tab 1');
    assert.strictEqual(widget.tabs[0].tabTooltip, 'Updated Tooltip');
    assert.strictEqual(widget.tabsById.get('tab1')?.tooltip, 'Updated Tooltip');
    assert.strictEqual(
        widget.tabsById.get('tab1')?.tabElement.querySelector('.tabbed-pane-header-tab-title')?.getAttribute('title'),
        'Updated Tooltip');
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

  it('re-runs overflow detection when a lazily-created right toolbar grows', async () => {
    // Render a tabbed-pane WITHOUT a slotted right toolbar so calling
    // `rightToolbar()` falls into the lazy-creation branch — which is
    // the regime where the issues counter ends up living in
    // InspectorView. Without the ResizeObserver wired up on the
    // lazily-created toolbar, growing this toolbar later would not
    // trigger a re-run of overflow detection and the after-tabs plus
    // button could be visually covered by the late-arriving toolbar
    // items.
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

    const rightToolbar = widget.rightToolbar();
    // Sanity check: it's the lazy path (appended directly to header,
    // not slotted from light DOM).
    assert.strictEqual(
        rightToolbar.parentElement, widget.headerElement(),
        'lazily-created right toolbar should be appended to the header element');

    let updates = 0;
    const originalRequestUpdate = widget.requestUpdate.bind(widget);
    widget.requestUpdate = () => {
      updates++;
      originalRequestUpdate();
    };

    // Grow the toolbar by giving it a non-zero width. ResizeObserver
    // delivers callbacks before the next paint, so two animation frames
    // is enough to flush the notification and the resulting update.
    rightToolbar.style.minWidth = '120px';
    await doubleRaf();

    assert.isAbove(updates, 0, 'requestUpdate() should have been called after the lazily-created right toolbar grew');
  });

  it('hides the legacy chevron and reserves width when a trailing-button is slotted', async () => {
    // Render a tabbed-pane with a slotted trailing button. Constrain
    // the host width so the legacy chevron would normally appear, then
    // assert it is suppressed and the slotted button is rendered
    // instead.
    const container = document.createElement('div');
    container.style.width = '120px';
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="A long tab title">Content 1</div>
        <div id="tab2" title="Another long tab title">Content 2</div>
        <div id="tab3" title="Yet another tab">Content 3</div>
        <button slot="trailing-button" id="trailing"
                style="width: 24px; height: 24px;">+</button>
      </devtools-tabbed-pane>
    `,
        container);
    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    await doubleRaf();

    // The slotted trailing button is rendered.
    const trailing = tabbedPaneElement.querySelector('#trailing');
    assert.exists(trailing, 'slotted trailing-button should be in the DOM');

    // The legacy chevron container is NOT in the live tree (it would
    // be inside `headerContentsElement` if rendered).
    const chevron = widget.contentElement.querySelector('.tabbed-pane-header-tabs-drop-down-container');
    assert.isNull(chevron, 'legacy chevron must be suppressed when a trailing-button is slotted');

    // At least one tab overflowed (we constrained the host width and
    // reserved space for the trailing button), so `hiddenTabs()`
    // reports a non-empty list.
    assert.isAbove(widget.hiddenTabs().length, 0, 'expected at least one tab to overflow at the constrained width');
  });

  it('fires overflow-tabs-changed when the set of overflowed tabs changes', async () => {
    const container = document.createElement('div');
    container.style.width = '600px';
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="Tab 1">1</div>
        <div id="tab2" title="Tab 2">2</div>
        <div id="tab3" title="Tab 3">3</div>
        <button slot="trailing-button" id="trailing"
                style="width: 24px; height: 24px;">+</button>
      </devtools-tabbed-pane>
    `,
        container);
    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    await doubleRaf();

    // The first paint may itself fire an event for the initial state;
    // start counting from after that settles.
    const events: Array<Array<{id: string}>> = [];
    tabbedPaneElement.addEventListener('overflow-tabs-changed', (event: Event) => {
      const detail = (event as CustomEvent<{hiddenTabs: Array<{id: string}>}>).detail;
      events.push(detail.hiddenTabs);
    });

    // Shrink the host below the width needed to fit all 3 tabs +
    // trailing-button reservation, forcing at least one tab into
    // overflow.
    container.style.width = '120px';
    await doubleRaf();

    assert.isAbove(events.length, 0, 'overflow-tabs-changed should fire when overflow appears');
    const lastDetail = events[events.length - 1];
    assert.isAbove(lastDetail.length, 0, 'event detail should list at least one hidden tab');
  });

  it('does not refire overflow-tabs-changed when the hidden set is unchanged', async () => {
    const container = document.createElement('div');
    container.style.width = '120px';
    renderElementIntoDOM(container);
    render(
        html`
      <devtools-tabbed-pane>
        <div id="tab1" title="A long tab title">1</div>
        <div id="tab2" title="Another long tab title">2</div>
        <div id="tab3" title="Yet another tab">3</div>
        <button slot="trailing-button" id="trailing"
                style="width: 24px; height: 24px;">+</button>
      </devtools-tabbed-pane>
    `,
        container);
    const widget = UI.Widget.Widget.get(container.querySelector('devtools-tabbed-pane') as HTMLElement) as
        UI.TabbedPane.TabbedPane;
    await doubleRaf();

    let count = 0;
    container.querySelector('devtools-tabbed-pane')!.addEventListener('overflow-tabs-changed', () => {
      count++;
    });

    // Trigger an update without changing the overflow set.
    widget.requestUpdate();
    await doubleRaf();

    assert.strictEqual(count, 0, 'overflow-tabs-changed must not fire when hidden tab set is unchanged');
  });

  it('clears measured dropDownButton width and updates layout when ZOOM_CHANGED fires', async () => {
    const container = document.createElement('div');
    container.style.width = '200px';
    renderElementIntoDOM(container);
    render(html`
      <devtools-tabbed-pane>
        <devtools-toolbar slot="left" id="left-toolbar" style="width: 40px; min-width: 40px;"></devtools-toolbar>
        <devtools-toolbar slot="right" id="right-toolbar" style="width: 60px; min-width: 60px;"></devtools-toolbar>
        <div id="tab1" title="Tab 1">1</div>
        <div id="tab2" title="Tab 2">2</div>
      </devtools-tabbed-pane>
    `,
           container);
    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    await doubleRaf();

    // Verify clearMeasuredWidths clears measuredDropDownButtonWidth on ZOOM_CHANGED
    (widget as unknown as {measuredDropDownButtonWidth: number}).measuredDropDownButtonWidth = 999;
    UI.ZoomManager.ZoomManager.instance().dispatchEventToListeners(UI.ZoomManager.Events.ZOOM_CHANGED,
                                                                   {from: 1.0, to: 1.5});
    await doubleRaf();

    const measuredWidth = (widget as unknown as {measuredDropDownButtonWidth: number}).measuredDropDownButtonWidth;
    assert.isNumber(measuredWidth);
    assert.notStrictEqual(measuredWidth, 999,
                          'measuredDropDownButtonWidth should be invalidated and re-measured after ZOOM_CHANGED');
  });
  it('fires close and taborderchanged events and respects properties on TabbedPaneElement', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);
    render(html`
      <devtools-tabbed-pane .closeableTabs=${true} .allowTabReorder=${true}>
        <div id="tab1" title="Tab 1">Content 1</div>
        <div id="tab2" title="Tab 2" uncloseable>Content 2</div>
        <div id="tab3" title="Tab 3" closeable>Content 3</div>
      </devtools-tabbed-pane>
    `,
           container);
    const tabbedPaneElement = container.querySelector('devtools-tabbed-pane') as UI.TabbedPane.TabbedPaneElement;
    const widget = UI.Widget.Widget.get(tabbedPaneElement) as UI.TabbedPane.TabbedPane;
    // doubleRaf is needed for some updates but Lit render might just need raf
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));

    assert.isTrue(widget.allowTabReorder, 'allowTabReorder should be delegated to the widget');

    const tabs = widget.tabsById;
    assert.isTrue(tabs.get('tab1')?.closeable, 'tab1 should inherit global closeableTabs=true');
    assert.isFalse(tabs.get('tab2')?.closeable, 'tab2 should respect uncloseable attribute');
    assert.isTrue(tabs.get('tab3')?.closeable, 'tab3 should respect closeable attribute');

    let orderChangedEventDetail: {tabId: string, tabIds: string[]}|null = null;
    tabbedPaneElement.addEventListener('taborderchanged', (e: Event) => {
      orderChangedEventDetail = (e as CustomEvent).detail;
    });
    widget.moveTab('tab3', 0);

    const orderChangedEventDetailTyped = orderChangedEventDetail as {tabId: string, tabIds: string[]} | null;
    assert.isNotNull(orderChangedEventDetailTyped, 'taborderchanged event should have fired');
    assert.strictEqual(orderChangedEventDetailTyped.tabId, 'tab3');
    assert.deepEqual(orderChangedEventDetailTyped.tabIds, ['tab3', 'tab1', 'tab2']);

    let closeEventDetail: {tabId: string}|null = null;
    tabbedPaneElement.addEventListener('close', (e: Event) => {
      closeEventDetail = (e as CustomEvent).detail;
    });

    widget.closeTab('tab1');
    const closeEventDetailTyped = closeEventDetail as {tabId: string} | null;
    assert.isNotNull(closeEventDetailTyped, 'close event should have fired');
    assert.strictEqual(closeEventDetailTyped.tabId, 'tab1');
  });

  describe('icon and suffix', () => {
    function renderTabbedPane(template: LitTemplate): UI.TabbedPane.TabbedPane {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      render(html`<devtools-tabbed-pane>${template}</devtools-tabbed-pane>`, container);
      return UI.Widget.Widget.get(container.querySelector('devtools-tabbed-pane')!) as UI.TabbedPane.TabbedPane;
    }

    function slotted(widget: UI.TabbedPane.TabbedPane, id: string, kind: 'icon'|'suffix'): Element[] {
      const slot = widget.tabsById.get(id)!.tabElement.querySelector(`slot[name="${kind}-${id}"]`);
      assert.instanceOf(slot, HTMLSlotElement);
      // The slot has `display: contents`, so check the visibility of its container.
      return slot.parentElement!.checkVisibility() ? slot.assignedElements() : [];
    }

    it('shows slotted elements in the tab header', async () => {
      const widget = renderTabbedPane(html`
        <div id="tab1" title="Tab 1">Content 1</div>
        <devtools-icon slot="icon-tab1" name="warning" title="Icon"></devtools-icon>
        <svg slot="suffix-tab1"><circle r="1"></circle></svg>
        <div id="tab2" title="Tab 2">Content 2</div>`);
      await doubleRaf();

      const [icon] = slotted(widget, 'tab1', 'icon');
      assert.strictEqual(icon.localName, 'devtools-icon');
      assert.strictEqual(icon.getAttribute('title'), 'Icon');
      const [suffix] = slotted(widget, 'tab1', 'suffix');
      assert.strictEqual(suffix.localName, 'svg');
      assert.strictEqual(suffix.childElementCount, 1);
      assert.isEmpty(slotted(widget, 'tab2', 'icon'));
      assert.isEmpty(slotted(widget, 'tab2', 'suffix'));
    });

    it('updates icon and suffix when they change', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      const icons: Record<string, LitTemplate> = {
        A: html`<span slot="icon-tab1">A</span>`,
        B: html`<devtools-icon slot="icon-tab1" name="B"></devtools-icon>`,
      };
      function renderTabs(icon: string|null, suffix: string|null): void {
        render(html`
          <devtools-tabbed-pane>
            <div id="tab1" title="Tab 1">Content 1</div>
            ${icon ? icons[icon] : nothing}
            ${suffix ? html`<span slot="suffix-tab1">${suffix}</span>` : nothing}
          </devtools-tabbed-pane>`,
               container);
      }
      renderTabs('A', 'S1');
      const widget = UI.Widget.Widget.get(container.querySelector('devtools-tabbed-pane')!) as UI.TabbedPane.TabbedPane;
      const iconAndSuffix = () => [...slotted(widget, 'tab1', 'icon'), ...slotted(widget, 'tab1', 'suffix')].map(
          element => element.textContent || element.getAttribute('name'));
      await doubleRaf();
      assert.deepEqual(iconAndSuffix(), ['A', 'S1']);

      renderTabs('B', 'S2');
      await doubleRaf();
      assert.deepEqual(iconAndSuffix(), ['B', 'S2']);

      renderTabs(null, null);
      await doubleRaf();
      assert.deepEqual(iconAndSuffix(), []);

      renderTabs('A', 'S3');
      await doubleRaf();
      assert.deepEqual(iconAndSuffix(), ['A', 'S3']);
    });

    it('reserves space for the icon and suffix in the tab width', async () => {
      const widget = renderTabbedPane(html`
        <div id="tab1" title="Tab">Content 1</div>
        <span slot="icon-tab1">I</span>
        <span slot="suffix-tab1">S</span>
        <div id="tab2" title="Tab">Content 2</div>`);
      await doubleRaf();

      const tab1Width = widget.tabsById.get('tab1')!.tabElement.getBoundingClientRect().width;
      const tab2Width = widget.tabsById.get('tab2')!.tabElement.getBoundingClientRect().width;
      assert.isAbove(tab1Width, tab2Width);
    });

    it('reserves the actual width of the slotted content in the tab width', async () => {
      const widget = renderTabbedPane(html`
        <div id="tab1" title="Tab">Content 1</div>
        <span slot="icon-tab1" style="display: inline-block; width: 100px"></span>
        <div id="tab2" title="Tab">Content 2</div>`);
      await doubleRaf();

      // Tab widths are set from measurements of separate measuring elements.
      const tab1 = widget.tabsById.get('tab1')!;
      const tab2 = widget.tabsById.get('tab2')!;
      assert.isAtLeast(tab1.width() - tab2.width(), 100);
      assert.strictEqual(tab1.tabElement.style.width, `${tab1.width()}px`);
    });

    it('detaches slots from the tab header when the tab is closed', async () => {
      const widget = renderTabbedPane(html`<div id="tab1" title="Tab 1">Content 1</div>`);
      await doubleRaf();
      const tabElement = widget.tabsById.get('tab1')!.tabElement;
      const slots = tabElement.querySelectorAll('slot');
      assert.lengthOf(slots, 2);

      widget.closeTab('tab1');

      for (const slot of slots) {
        assert.isNull(slot.parentElement);
      }
    });

    it('does not flicker infinitely when tab width without icon fits but with icon does not', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);

      render(html`
        <devtools-tabbed-pane>
          <div id="tab1" title="Tab 1">Content 1</div>
          <div id="tab2" title="Tab 2">Content 2</div>
          <span slot="icon-tab2" style="display: inline-block; width: 100px"></span>
        </devtools-tabbed-pane>`,
             container);

      await doubleRaf();
      const widget = UI.Widget.Widget.get(container.querySelector('devtools-tabbed-pane')!) as UI.TabbedPane.TabbedPane;

      const tab1 = widget.tabsById.get('tab1')!;
      const tab2 = widget.tabsById.get('tab2')!;
      assert.isTrue(tab1.shown);
      assert.isTrue(tab2.shown);

      const tab1Width = tab1.width();
      const tab2WidthWithoutIcon = tab2.width() - 100;

      // Make the header wide enough for tab2 only if its icon is not counted.
      container.style.width = `${tab1Width + tab2WidthWithoutIcon + 15}px`;
      container.style.display = 'block';

      const performUpdate = sinon.spy(widget, 'performUpdate');
      widget.headerResized();

      for (let i = 0; i < 20; i++) {
        await raf();
      }

      assert.isAtMost(performUpdate.callCount, 5);
      assert.isTrue(tab1.shown);
      assert.isFalse(tab2.shown);
    });

    it('updates the tab width when the icon was removed while the tab was overflowed', async () => {
      const container = document.createElement('div');
      renderElementIntoDOM(container);
      function renderTabs(icon: boolean): void {
        render(html`
          <devtools-tabbed-pane>
            <div id="tab1" title="Tab 1">Content 1</div>
            <div id="tab2" title="Tab 2">Content 2</div>
            ${icon ? html`<span slot="icon-tab2" style="display: inline-block; width: 40px"></span>` : nothing}
          </devtools-tabbed-pane>`,
               container);
      }
      renderTabs(true);
      await doubleRaf();
      const widget = UI.Widget.Widget.get(container.querySelector('devtools-tabbed-pane')!) as UI.TabbedPane.TabbedPane;
      const tab1 = widget.tabsById.get('tab1')!;
      const tab2 = widget.tabsById.get('tab2')!;
      const tab2WidthWithoutIcon = tab2.width() - 40;

      // Make the header wide enough for tab2 only if it has no icon.
      container.style.width = `${tab1.width() + tab2WidthWithoutIcon + 15}px`;
      container.style.display = 'block';
      widget.headerResized();
      await doubleRaf();
      assert.isTrue(tab1.shown);
      assert.isFalse(tab2.shown);

      // No `slotchange` fires for the detached slot, so the tab keeps its
      // width until it is shown again.
      renderTabs(false);
      await doubleRaf();
      assert.isFalse(tab2.shown);

      // Selecting tab2 re-attaches its header, which syncs the slot state
      // and triggers a re-measurement, after which both tabs fit again.
      widget.selectTab('tab2');
      for (let i = 0; i < 5; i++) {
        await raf();
      }
      assert.isTrue(tab1.shown);
      assert.isTrue(tab2.shown);
      assert.isAtMost(tab2.width(), tab2WidthWithoutIcon);
    });
  });
});
