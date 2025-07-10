// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../models/trace/trace.js';
import {raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {getMainThread} from '../../testing/TraceHelpers.js';
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
  highlightEvent(_event: Trace.Types.Events.Event|null): void {
  }
}

async function renderCountersGraphForMainThread(context: Mocha.Context): Promise<{
  countersGraph: Timeline.CountersGraph.CountersGraph,
  parsedTrace: Trace.Handlers.Types.ParsedTrace,
}> {
  const timelineModeViewDelegate = new FakeTimelineModeViewDelegate();
  const {parsedTrace} = await TraceLoader.traceEngine(context, 'web-dev-with-commit.json.gz');
  const countersGraph = new Timeline.CountersGraph.CountersGraph(timelineModeViewDelegate);
  renderElementIntoDOM(countersGraph);

  const mainThread = getMainThread(parsedTrace.Renderer);
  countersGraph.setModel(parsedTrace, mainThread.entries);
  await raf();
  return {countersGraph, parsedTrace};
}

describeWithEnvironment('CountersGraph', () => {
  it('shows the counters and the ranges in the toolbar', async function() {
    const {countersGraph} = await renderCountersGraphForMainThread(this);
    const checkboxes = countersGraph.element.querySelectorAll('devtools-checkbox');
    const userVisibleLabels = Array.from(checkboxes, checkbox => checkbox.getLabelText());
    assert.deepEqual(userVisibleLabels, [
      'JS heap [1.5 MB – 1.5 MB]',
      'Documents [4 – 4]',
      'Nodes [54 – 54]',
      'Listeners [8 – 8]',
      'GPU memory',
    ]);

    const ariaLabels = Array.from(checkboxes, checkbox => checkbox.getAttribute('aria-label'));
    assert.deepEqual(ariaLabels, [
      'JS heap [1.5 MB – 1.5 MB]',
      'Documents [4 – 4]',
      'Nodes [54 – 54]',
      'Listeners [8 – 8]',
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
