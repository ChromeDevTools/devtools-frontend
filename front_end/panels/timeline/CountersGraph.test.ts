// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

class FakeTimelineModeViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  element = document.createElement('div');
  select(_selection: Timeline.TimelineSelection.TimelineSelection|null): void {
  }
  set3PCheckboxDisabled(_disabled: boolean): void {
  }
  selectEntryAtTime(_events: Trace.Types.Events.Event[]|null, _time: number): void {
  }
  zoomEvent(_event: Trace.Types.Events.Event): void {
  }
  highlightEvent(_event: Trace.Types.Events.Event|null): void {
  }
}

async function renderCountersGraphForMainThread(context: Mocha.Context): Promise<{
  countersGraph: Timeline.CountersGraph.CountersGraph,
  parsedTrace: Trace.TraceModel.ParsedTrace,
}> {
  const timelineModeViewDelegate = new FakeTimelineModeViewDelegate();
  const parsedTrace = await TraceLoader.traceEngine(context, 'web-dev-with-commit.json.gz');
  const countersGraph = new Timeline.CountersGraph.CountersGraph(timelineModeViewDelegate);
  // Dispatch the bounds change event so the counters graph knows the min/max
  // time for the current trace
  TraceBounds.TraceBounds.BoundsManager.instance().resetWithNewBounds(parsedTrace.data.Meta.traceBounds);
  renderElementIntoDOM(countersGraph);

  // This is the PID + TID for the main thread for web-dev-with-commit.
  const pid = Trace.Types.Events.ProcessID(90829);
  const tid = Trace.Types.Events.ThreadID(259);
  const mainThread = parsedTrace.data.Renderer.processes.get(pid)?.threads.get(tid);
  assert.isOk(mainThread, 'could not find main thread');

  countersGraph.setModel(parsedTrace, mainThread.entries);
  await countersGraph.updateComplete;
  return {countersGraph, parsedTrace};
}

describeWithEnvironment('CountersGraph', () => {
  it('shows the counters and the ranges in the toolbar', async function() {
    const {countersGraph} = await renderCountersGraphForMainThread(this);
    const checkboxes = countersGraph.element.querySelectorAll('devtools-checkbox');
    const userVisibleLabels = Array.from(checkboxes, checkbox => checkbox.getLabelText());
    assert.deepEqual(userVisibleLabels, [
      'JS heap [704 kB – 5.5 MB]',
      'Documents [3 – 14]',
      'Nodes [12 – 2,723]',
      'Listeners [0 – 77]',
      'GPU memory',
    ]);

    const ariaLabels = Array.from(checkboxes, checkbox => checkbox.getAttribute('aria-label'));
    assert.deepEqual(ariaLabels, [
      'JS heap [704 kB – 5.5 MB]',
      'Documents [3 – 14]',
      'Nodes [12 – 2,723]',
      'Listeners [0 – 77]',
      'GPU memory',
    ]);
  });

  it('clears the ranges when the counter graph is reset', async function() {
    const {countersGraph, parsedTrace} = await renderCountersGraphForMainThread(this);
    const checkboxes = countersGraph.element.querySelectorAll('devtools-checkbox');
    // Setting the model to have an empty set of events is enough to reset the existing view
    countersGraph.setModel(parsedTrace, []);
    await raf();
    const userVisibleLabels = Array.from(checkboxes, checkbox => checkbox.getLabelText());

    // No ranges after the label
    assert.deepEqual(userVisibleLabels, [
      'JS heap',
      'Documents',
      'Nodes',
      'Listeners',
      'GPU memory',
    ]);
  });
});
