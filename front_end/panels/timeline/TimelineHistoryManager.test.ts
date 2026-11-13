// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, it} from 'mocha';
import sinon from 'sinon';

import * as Trace from '../../models/trace/trace.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  registerNoopActions,
} from '../../testing/EnvironmentHelpers.js';
import {getBaseTraceHandlerData} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

function getDropDown(): HTMLElement {
  const instance = Timeline.TimelineHistoryManager.DropDown.instance;
  if (instance?.contentElement) {
    return instance.contentElement;
  }
  const glassPane = document.querySelector('div[data-devtools-glass-pane]');
  const dropdown =
      glassPane?.shadowRoot?.querySelector('.widget')?.shadowRoot?.querySelector<HTMLElement>('.drop-down');
  assert.isOk(dropdown, 'Dropdown element not found');
  return dropdown;
}

function getDropDownMenu(): HTMLElement {
  const dropdown = getDropDown();
  const menu = dropdown.querySelector<HTMLElement>('[role="menu"]');
  assert.isOk(menu, 'Dropdown menu element not found');
  return menu;
}

function getMenuItems(container: HTMLElement = getDropDownMenu()): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

function getMenuItemsText(container: HTMLElement = getDropDownMenu()): string[] {
  return getMenuItems(container).map(elem => elem.innerText.replaceAll('\n', '-'));
}

function getSelectedMenuItem(container: HTMLElement = getDropDownMenu()): HTMLElement|null {
  return container.querySelector<HTMLElement>('[role="menuitem"].selected');
}

function getSelectedMenuItemText(container: HTMLElement = getDropDownMenu()): string|null {
  const selected = getSelectedMenuItem(container);
  return selected ? selected.innerText.replaceAll('\n', '-') : null;
}

function pressKey(key: string, target: HTMLElement = getDropDownMenu()): void {
  target.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
  }));
}

function hoverMenuItem(item: HTMLElement): void {
  item.dispatchEvent(new MouseEvent('mousemove', {
    bubbles: true,
    composed: true,
    cancelable: true,
  }));
}

function clickMenuItem(item: HTMLElement): void {
  item.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    composed: true,
    cancelable: true,
  }));
}

async function openDropDown(historyManager: Timeline.TimelineHistoryManager.TimelineHistoryManager):
    Promise<{showPromise: Promise<Timeline.TimelineHistoryManager.RecordingData|null>}> {
  const showPromise = historyManager.showHistoryDropDown();
  await raf();
  return {showPromise};
}

async function renderDropDownForScreenshot(): Promise<void> {
  const instance = Timeline.TimelineHistoryManager.DropDown.instance;
  const host = instance?.contentElement.parentNodeOrShadowHost();
  assert.isOk(host);
  renderElementIntoDOM(host);
  await raf();
}

function getOverviewCanvas(item: HTMLElement): HTMLCanvasElement {
  const canvas = item.querySelector('canvas');
  assert.isOk(canvas, 'Expected preview item to contain an overview canvas');
  return canvas;
}

function addSyntheticRecording(
    historyManager: Timeline.TimelineHistoryManager.TimelineHistoryManager,
    options: {
      parsedTraceIndex: number,
      url?: string,
      title?: string,
      cpuThrottling?: number,
      networkThrottling?: string,
      filmStripForPreview?: Trace.Extras.FilmStrip.Data|null,
    },
    ): void {
  const baseTraceData = getBaseTraceHandlerData();
  const parsedTrace = getBaseTraceHandlerData({
    Meta: {
      ...baseTraceData.data.Meta,
      mainFrameURL: options.url ?? 'https://example.com',
    },
  });
  if (options.title) {
    parsedTrace.metadata.title = options.title;
  }
  if (options.cpuThrottling !== undefined) {
    parsedTrace.metadata.cpuThrottling = options.cpuThrottling;
  }
  if (options.networkThrottling !== undefined) {
    parsedTrace.metadata.networkThrottling = options.networkThrottling;
  }
  historyManager.addRecording({
    data: {
      parsedTraceIndex: options.parsedTraceIndex,
      type: 'TRACE_INDEX',
    },
    filmStripForPreview: options.filmStripForPreview ?? null,
    parsedTrace,
  });
}

describeWithEnvironment('TimelineHistoryManager', function() {
  let historyManager: Timeline.TimelineHistoryManager.TimelineHistoryManager;
  beforeEach(() => {
    registerNoopActions(['timeline.show-history']);
    historyManager = new Timeline.TimelineHistoryManager.TimelineHistoryManager();
  });

  afterEach(() => {
    Timeline.TimelineHistoryManager.DropDown.cancelIfShowing();
  });

  it('shows the dropdown including a landing page link', async function() {
    assert.strictEqual(historyManager.button().element.innerText, 'Live metrics');

    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 1,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace,
        },
    );

    assert.strictEqual(historyManager.button().element.innerText, 'web.dev #1');

    const {showPromise} = await openDropDown(historyManager);
    assert.isOk(getDropDown());

    const menuItemText = getMenuItemsText();
    assert.deepEqual(menuItemText, ['Live metrics', 'web.dev #1-1× slowdown, No throttling']);

    // Cancel the dropdown, which also resolves the show() promise, meaning we
    // don't leak it into other tests.
    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('shows a minimap for each trace in the dropdown', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 1,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace,
        },
    );

    assert.strictEqual(historyManager.button().element.innerText, 'web.dev #1');

    const {showPromise} = await openDropDown(historyManager);

    await renderDropDownForScreenshot();
    await assertScreenshot('timeline/timeline_history_manager.png');

    // Ensure we get rid of the dropdown & glass pane.
    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('uses Node specific landing page title', async function() {
    historyManager = new Timeline.TimelineHistoryManager.TimelineHistoryManager(undefined, true);
    assert.strictEqual(historyManager.button().element.innerText, 'New recording');

    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 1,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace,
        },
    );

    const {showPromise} = await openDropDown(historyManager);
    assert.isOk(getDropDown());

    const menuItemText = getMenuItemsText();
    assert.deepEqual(menuItemText, ['New recording', 'web.dev #1-1× slowdown, No throttling']);

    // Cancel the dropdown, which also resolves the show() promise, meaning we
    // don't leak it into other tests.
    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('can select from multiple parsed data objects', async function() {
    // Add two parsed data objects to the history manager.
    const parsedTrace1 = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');
    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 1,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace: parsedTrace1,
        },
    );

    const parsedTrace2 = await TraceLoader.traceEngine(this, 'slow-interaction-keydown.json.gz');
    historyManager.addRecording({
      data: {
        parsedTraceIndex: 2,
        type: 'TRACE_INDEX',
      },
      filmStripForPreview: null,
      parsedTrace: parsedTrace2,
    });

    // Make sure the correct model is returned when
    // using the history manager to navigate between trace files..
    const previousRecording = historyManager.navigate(1);
    assert.strictEqual(previousRecording?.parsedTraceIndex, 1);

    const nextRecording = historyManager.navigate(-1);
    assert.strictEqual(nextRecording?.parsedTraceIndex, 2);
  });

  it('uses custom metadata title when provided', async function() {
    const baseTraceData = getBaseTraceHandlerData();
    const parsedTrace = getBaseTraceHandlerData({
      Meta: {
        ...baseTraceData.data.Meta,
        mainFrameURL: 'https://web.dev',
      },
    });
    parsedTrace.metadata.title = 'Custom Benchmark Title';
    parsedTrace.metadata.cpuThrottling = 1;
    parsedTrace.metadata.networkThrottling = 'No throttling';

    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 1,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace,
        },
    );

    assert.strictEqual(historyManager.button().element.innerText, 'Custom Benchmark Title (web.dev #1)');

    const {showPromise} = await openDropDown(historyManager);
    assert.isOk(getDropDown());

    const menuItemText = getMenuItemsText();
    assert.deepEqual(menuItemText, ['Live metrics', 'Custom Benchmark Title (web.dev #1)-1× slowdown, No throttling']);

    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('highlights the active recording when the dropdown opens', async function() {
    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});
    addSyntheticRecording(historyManager, {parsedTraceIndex: 2, url: 'https://b.com'});

    assert.strictEqual(historyManager.button().element.innerText, 'b.com #1');

    const {showPromise} = await openDropDown(historyManager);
    assert.deepEqual(getMenuItemsText(), ['Live metrics', 'b.com #1', 'a.com #1']);
    assert.strictEqual(getSelectedMenuItemText(), 'b.com #1');

    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('navigates through items with ArrowDown and ArrowUp with wrap-around', async function() {
    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});
    addSyntheticRecording(historyManager, {parsedTraceIndex: 2, url: 'https://b.com'});

    const {showPromise} = await openDropDown(historyManager);
    assert.strictEqual(getSelectedMenuItemText(), 'b.com #1');

    pressKey('ArrowDown');
    assert.strictEqual(getSelectedMenuItemText(), 'a.com #1');

    // Wraps around to landing page item
    pressKey('ArrowDown');
    assert.strictEqual(getSelectedMenuItemText(), 'Live metrics');

    pressKey('ArrowDown');
    assert.strictEqual(getSelectedMenuItemText(), 'b.com #1');

    // ArrowUp moves backwards and wraps around
    pressKey('ArrowUp');
    assert.strictEqual(getSelectedMenuItemText(), 'Live metrics');

    pressKey('ArrowUp');
    assert.strictEqual(getSelectedMenuItemText(), 'a.com #1');

    pressKey('ArrowUp');
    assert.strictEqual(getSelectedMenuItemText(), 'b.com #1');

    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('selects first and last items with Home and End', async function() {
    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});
    addSyntheticRecording(historyManager, {parsedTraceIndex: 2, url: 'https://b.com'});

    const {showPromise} = await openDropDown(historyManager);
    assert.strictEqual(getSelectedMenuItemText(), 'b.com #1');

    pressKey('Home');
    assert.strictEqual(getSelectedMenuItemText(), 'Live metrics');

    pressKey('End');
    assert.strictEqual(getSelectedMenuItemText(), 'a.com #1');

    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('resolves with the selected recording on Enter, updates button text, and closes', async function() {
    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});
    addSyntheticRecording(historyManager, {parsedTraceIndex: 2, url: 'https://b.com'});

    const {showPromise} = await openDropDown(historyManager);
    pressKey('ArrowDown');
    assert.strictEqual(getSelectedMenuItemText(), 'a.com #1');

    pressKey('Enter');
    const result = await showPromise;

    assert.deepEqual(result, {type: 'TRACE_INDEX', parsedTraceIndex: 1});
    assert.strictEqual(historyManager.button().element.innerText, 'a.com #1');
    assert.isNull(Timeline.TimelineHistoryManager.DropDown.instance);
  });

  for (const key of ['Escape', 'Tab']) {
    it(`resolves with null on ${key} without changing the active recording`, async function() {
      addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});
      addSyntheticRecording(historyManager, {parsedTraceIndex: 2, url: 'https://b.com'});

      const {showPromise} = await openDropDown(historyManager);
      pressKey('ArrowDown');
      assert.strictEqual(getSelectedMenuItemText(), 'a.com #1');

      pressKey(key);
      assert.isNull(await showPromise);
      assert.strictEqual(historyManager.button().element.innerText, 'b.com #1');
      assert.isNull(Timeline.TimelineHistoryManager.DropDown.instance);
    });
  }

  it('resolves with the clicked recording', async function() {
    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});
    addSyntheticRecording(historyManager, {parsedTraceIndex: 2, url: 'https://b.com'});

    const {showPromise} = await openDropDown(historyManager);
    clickMenuItem(getMenuItems()[2]);

    assert.deepEqual(await showPromise, {type: 'TRACE_INDEX', parsedTraceIndex: 1});
    assert.strictEqual(historyManager.button().element.innerText, 'a.com #1');
    assert.isNull(Timeline.TimelineHistoryManager.DropDown.instance);
  });

  it('resolves with the landing page when the landing page item is clicked', async function() {
    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});

    const {showPromise} = await openDropDown(historyManager);
    clickMenuItem(getMenuItems()[0]);

    assert.deepEqual(await showPromise, {type: 'LANDING_PAGE'});
    assert.strictEqual(historyManager.button().element.innerText, 'Live metrics');
    assert.isNull(Timeline.TimelineHistoryManager.DropDown.instance);
  });

  it('selects an item on hover', async function() {
    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});
    addSyntheticRecording(historyManager, {parsedTraceIndex: 2, url: 'https://b.com'});

    const {showPromise} = await openDropDown(historyManager);
    assert.strictEqual(getSelectedMenuItemText(), 'b.com #1');

    const items = getMenuItems();
    hoverMenuItem(items[2]);
    assert.strictEqual(getSelectedMenuItemText(), 'a.com #1');

    hoverMenuItem(items[0]);
    assert.strictEqual(getSelectedMenuItemText(), 'Live metrics');

    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('manages enabled state and resolves with null when disabled or empty', async function() {
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.show-history');
    const buttonElement = historyManager.button().element as HTMLButtonElement;

    // Initially with 0 recordings
    assert.isFalse(action.enabled());
    assert.isTrue(buttonElement.disabled);
    const resultWithoutRecordings = await historyManager.showHistoryDropDown();
    assert.isNull(resultWithoutRecordings);

    // Adding a recording enables the action and button
    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});
    assert.isTrue(action.enabled());
    assert.isFalse(buttonElement.disabled);

    // setEnabled(false) disables action and button
    historyManager.setEnabled(false);
    assert.isFalse(action.enabled());
    assert.isTrue(buttonElement.disabled);
    const resultWhenDisabled = await historyManager.showHistoryDropDown();
    assert.isNull(resultWhenDisabled);

    // setEnabled(true) re-enables
    historyManager.setEnabled(true);
    assert.isTrue(action.enabled());
    assert.isFalse(buttonElement.disabled);
  });

  it('sets aria-haspopup and descriptive aria-label on the toolbar button', async function() {
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.show-history');
    const actionTitle = action.title();
    const buttonElement = historyManager.button().element;

    assert.strictEqual(buttonElement.getAttribute('aria-haspopup'), 'true');

    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://example.com'});
    assert.strictEqual(
        buttonElement.getAttribute('aria-label'),
        `Current session: example.com #1. ${actionTitle}`,
    );
  });

  it('exposes accessible menu and menuitem roles and labels', async function() {
    addSyntheticRecording(historyManager, {parsedTraceIndex: 1, url: 'https://a.com'});

    const {showPromise} = await openDropDown(historyManager);
    const menu = getDropDownMenu();
    assert.strictEqual(menu.getAttribute('role'), 'menu');
    assert.strictEqual(menu.getAttribute('aria-label'), 'Select timeline session');

    const items = getMenuItems();
    assert.isAbove(items.length, 0);
    for (const item of items) {
      assert.strictEqual(item.getAttribute('role'), 'menuitem');
    }

    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('evicts the least recently used recording when max recordings is reached', async function() {
    const clock = sinon.useFakeTimers({toFake: ['Date']});

    // Add 5 recordings at increasing timestamps (r1: 1000, r2: 2000, ..., r5: 5000)
    for (let i = 1; i <= 5; i++) {
      clock.tick(1000);
      addSyntheticRecording(historyManager, {parsedTraceIndex: i, url: `https://r${i}.com`});
    }

    // recordings array is currently [r5, r4, r3, r2, r1].
    // r5 is currently active (index 0).
    // Navigate by +4 to reach r1 (index 4), which is the oldest recording.
    clock.tick(1000);
    const navigated = historyManager.navigate(4);
    assert.strictEqual(navigated?.parsedTraceIndex, 1);

    // Now r1 was used at timestamp 6000.
    // The least recently used recording is now r2 (timestamp 2000).
    clock.tick(1000);
    addSyntheticRecording(historyManager, {parsedTraceIndex: 6, url: 'https://r6.com'});

    // Open dropdown and verify r2 was evicted while r1 was kept.
    const {showPromise} = await openDropDown(historyManager);
    const itemTexts = getMenuItemsText();
    assert.deepEqual(itemTexts, [
      'Live metrics',
      'r6.com #1',
      'r5.com #1',
      'r4.com #1',
      'r3.com #1',
      'r1.com #1',
    ]);

    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('shows a dropdown with a filmstrip thumbnail for a trace', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev.json.gz');
    const filmStrip = Trace.Extras.FilmStrip.fromHandlerData(parsedTrace.data);
    assert.isAbove(filmStrip.frames.length, 0);

    historyManager.addRecording({
      data: {
        parsedTraceIndex: 1,
        type: 'TRACE_INDEX',
      },
      filmStripForPreview: filmStrip,
      parsedTrace,
    });

    const {showPromise} = await openDropDown(historyManager);
    const dropdown = getDropDown();
    const thumbnailImg = dropdown.querySelector('.screenshot-thumb img');
    assert.isOk(thumbnailImg, 'Thumbnail <img> element not found');

    await renderDropDownForScreenshot();
    await assertScreenshot('timeline/timeline_history_manager_filmstrip.png');

    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('snapshots the overview into a canvas with expected dimensions and pixel content', async function() {
    const parsedTrace = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');

    historyManager.addRecording({
      data: {
        parsedTraceIndex: 1,
        type: 'TRACE_INDEX',
      },
      filmStripForPreview: null,
      parsedTrace,
    });

    const {showPromise} = await openDropDown(historyManager);
    const menuItems = getMenuItems();
    assert.lengthOf(menuItems, 2);

    const recordingItem = menuItems[1];
    const canvas = getOverviewCanvas(recordingItem);

    const dPR = window.devicePixelRatio;
    const expectedWidth = dPR * Timeline.TimelineHistoryManager.previewWidth;
    const expectedHeight = dPR * 31;  // 3 (responsiveness) + 20 (CPU) + 8 (network)

    assert.strictEqual(canvas.width, expectedWidth);
    assert.strictEqual(canvas.height, expectedHeight);

    const ctx = canvas.getContext('2d');
    assert.isOk(ctx);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let hasNonTransparentPixel = false;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) {
        hasNonTransparentPixel = true;
        break;
      }
    }
    assert.isTrue(hasNonTransparentPixel, 'Expected overview canvas to contain at least one non-transparent pixel');

    historyManager.cancelIfShowing();
    await showPromise;
  });
});
