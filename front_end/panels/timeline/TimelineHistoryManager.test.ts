// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import {
  describeWithEnvironment,
  registerNoopActions,
} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineHistoryManager', function() {
  let historyManager: Timeline.TimelineHistoryManager.TimelineHistoryManager;
  beforeEach(() => {
    registerNoopActions(['timeline.show-history']);
    historyManager = new Timeline.TimelineHistoryManager.TimelineHistoryManager();
  });

  afterEach(() => {
    UI.ActionRegistry.ActionRegistry.reset();
    Root.Runtime.experiments.disableForTest(Root.Runtime.ExperimentName.TIMELINE_OBSERVATIONS);
  });

  it('shows the dropdown including a landing page link if the observations experiment is enabled', async function() {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.TIMELINE_OBSERVATIONS);
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 1,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace,
          startTime: null,
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
    assert.deepEqual(menuItemText, ['Live metrics', 'web.dev5.39 s']);

    // Cancel the dropdown, which also resolves the show() promise, meaning we
    // don't leak it into other tests.
    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('does not show if observations experiment is disabled + the user has not imported 2 traces', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 1,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace,
          startTime: null,
        },
    );

    const promise = historyManager.showHistoryDropDown();
    const glassPane = document.querySelector('div[data-devtools-glass-pane]');
    assert.isNull(glassPane);  // check that no DOM for the dropdown got created
    // check the result of calling showHistoryDropDown which should be `null` if it didn't show
    const result = await promise;
    assert.isNull(result);
  });

  it('does not show the landing page link if the observations experiment is disabled', async function() {
    const {parsedTrace: parsedTrace1} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 1,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace: parsedTrace1,
          startTime: null,
        },
    );
    const {parsedTrace: parsedTrace2} = await TraceLoader.traceEngine(this, 'timings-track.json.gz');
    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 2,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace: parsedTrace2,
          startTime: null,
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
    assert.deepEqual(menuItemText, [
      'localhost3.16 s',
      'web.dev5.39 s',
    ]);

    // Cancel the dropdown, which also resolves the show() promise, meaning we
    // don't leak it into other tests.
    historyManager.cancelIfShowing();
    await showPromise;
  });

  it('can select from multiple parsed data objects', async function() {
    // Add two parsed data objects to the history manager.
    const {parsedTrace: trace1Data} = await TraceLoader.traceEngine(this, 'slow-interaction-button-click.json.gz');
    historyManager.addRecording(
        {
          data: {
            parsedTraceIndex: 1,
            type: 'TRACE_INDEX',
          },
          filmStripForPreview: null,
          parsedTrace: trace1Data,
          startTime: null,
        },
    );

    const {parsedTrace: trace2Data} = await TraceLoader.traceEngine(this, 'slow-interaction-keydown.json.gz');
    historyManager.addRecording({
      data: {
        parsedTraceIndex: 2,
        type: 'TRACE_INDEX',
      },
      filmStripForPreview: null,
      parsedTrace: trace2Data,
      startTime: null,
    });

    // Make sure the correct model is returned when
    // using the history manager to navigate between trace files..
    const previousRecording = historyManager.navigate(1);
    assert.strictEqual(previousRecording?.parsedTraceIndex, 1);

    const nextRecording = historyManager.navigate(-1);
    assert.strictEqual(nextRecording?.parsedTraceIndex, 2);
  });
});
