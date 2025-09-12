// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  describeWithEnvironment,
  registerNoopActions,
} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineHistoryManager', function() {
  let historyManager: Timeline.TimelineHistoryManager.TimelineHistoryManager;
  beforeEach(() => {
    registerNoopActions(['timeline.show-history']);
    historyManager = new Timeline.TimelineHistoryManager.TimelineHistoryManager();
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

    const showPromise = historyManager.showHistoryDropDown();
    const glassPane = document.querySelector('div[data-devtools-glass-pane]');
    const dropdown =
        glassPane?.shadowRoot?.querySelector('.widget')?.shadowRoot?.querySelector<HTMLElement>('.drop-down');
    assert.isOk(dropdown);

    const menuItemText = Array.from(dropdown.querySelectorAll<HTMLDivElement>('[role="menuitem"]'), elem => {
      return elem.innerText.replaceAll('\n', '');
    });
    assert.deepEqual(menuItemText, ['Live metrics', 'web.dev1× slowdown, No throttling']);

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

    const showPromise = historyManager.showHistoryDropDown();

    // Getting a screenshot is a bit more involved, as we need to put the
    // element into the test container div.
    // To do that we grab the contentElement's shadow parent (which is the
    // GlassPane with all the styles) and then copy it into the right place.
    const instance = Timeline.TimelineHistoryManager.DropDown.instance;
    const host = instance?.contentElement.parentNodeOrShadowHost();
    assert.isOk(host);
    renderElementIntoDOM(host);
    await raf();
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

    const showPromise = historyManager.showHistoryDropDown();
    const glassPane = document.querySelector('div[data-devtools-glass-pane]');
    const dropdown =
        glassPane?.shadowRoot?.querySelector('.widget')?.shadowRoot?.querySelector<HTMLElement>('.drop-down');
    assert.isOk(dropdown);

    const menuItemText = Array.from(dropdown.querySelectorAll<HTMLDivElement>('[role="menuitem"]'), elem => {
      return elem.innerText.replaceAll('\n', '');
    });
    assert.deepEqual(menuItemText, ['New recording', 'web.dev1× slowdown, No throttling']);

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
});
