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
});
