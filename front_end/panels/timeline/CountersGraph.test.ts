// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {it} from 'mocha';
import sinon from 'sinon';

import * as Trace from '../../models/trace/trace.js';
import * as TraceBounds from '../../services/trace_bounds/trace_bounds.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {microsecondsTraceWindow} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';
import type * as UI from '../../ui/legacy/legacy.js';

import * as Timeline from './timeline.js';
// The css file isn't exported by the bundle, so we need to import it directly.
import timelinePanelStyles from './timelinePanel.css.js';

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

async function renderCountersGraphForMainThread(
    context: Mocha.Context,
    size?: {width: number, height: number},
    ): Promise<{
  countersGraph: Timeline.CountersGraph.CountersGraph,
  parsedTrace: Trace.TraceModel.ParsedTrace,
}> {
  const timelineModeViewDelegate = new FakeTimelineModeViewDelegate();
  const parsedTrace = await TraceLoader.traceEngine(context, 'web-dev-with-commit.json.gz');
  const countersGraph = new Timeline.CountersGraph.CountersGraph(timelineModeViewDelegate);
  // Dispatch the bounds change event so the counters graph knows the min/max
  // time for the current trace
  TraceBounds.TraceBounds.BoundsManager.instance().resetWithNewBounds(parsedTrace.data.Meta.traceBounds);
  renderElementIntoDOM(countersGraph, {
    width: size?.width,
    height: size?.height,
    extraStyles: [timelinePanelStyles],
    includeCommonStyles: true,
  });

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
    const userVisibleLabels = Array.from(checkboxes, checkbox => checkbox.textContent?.trim());
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

  it('clears the ranges and shows empty state when the counter graph is reset', async function() {
    const {countersGraph, parsedTrace} = await renderCountersGraphForMainThread(this);
    const noEventsFound = countersGraph.element.querySelector<HTMLElement>('.no-events-found');
    assert.exists(noEventsFound);
    assert.isTrue(noEventsFound.hasAttribute('hidden'));

    const checkboxes = countersGraph.element.querySelectorAll('devtools-checkbox');
    // Setting the model to have an empty set of events is enough to reset the existing view
    countersGraph.setModel(parsedTrace, []);
    await countersGraph.updateComplete;
    const userVisibleLabels = Array.from(checkboxes, checkbox => checkbox.textContent?.trim());

    // No ranges after the label
    assert.deepEqual(userVisibleLabels, [
      'JS heap',
      'Documents',
      'Nodes',
      'Listeners',
      'GPU memory',
    ]);
    assert.isFalse(noEventsFound.hasAttribute('hidden'));
  });

  it('renders grid dividers for the visible trace window', async function() {
    const {countersGraph} = await renderCountersGraphForMainThread(this, {width: 800, height: 200});
    countersGraph.onResize();
    await countersGraph.updateComplete;

    const dividers = countersGraph.element.querySelectorAll<HTMLElement>('.resources-dividers .resources-divider');
    assert.isAbove(dividers.length, 0);
    for (const divider of dividers) {
      assert.match(divider.style.left, /%$/);
    }
  });

  it('shows hover markers and counter values on mouse move without recalculating X/Y arrays', async function() {
    const {countersGraph} = await renderCountersGraphForMainThread(this, {width: 800, height: 200});
    countersGraph.onResize();
    await countersGraph.updateComplete;

    const calculateXValuesSpy = sinon.spy(Timeline.CountersGraph.Counter.prototype, 'calculateXValues');
    const calculateYValuesSpy = sinon.spy(Timeline.CountersGraph.CounterUI.prototype, 'calculateYValues');

    const canvasContainer = countersGraph.element.querySelector<HTMLElement>('#memory-graphs-canvas-container');
    assert.exists(canvasContainer);
    const rect = canvasContainer.getBoundingClientRect();
    canvasContainer.dispatchEvent(new MouseEvent('mousemove', {clientX: rect.left + 100}));
    await countersGraph.updateComplete;

    sinon.assert.notCalled(calculateXValuesSpy);
    sinon.assert.notCalled(calculateYValuesSpy);

    const markers = countersGraph.element.querySelectorAll<HTMLElement>('.memory-counter-marker');
    assert.lengthOf(markers, 5);
    assert.isFalse(markers[0].hasAttribute('hidden'));
    assert.strictEqual(markers[0].style.left, '100px');
    assert.isTrue(markers[4].hasAttribute('hidden'));

    const values = countersGraph.element.querySelectorAll<HTMLElement>('#counter-values-bar .memory-counter-value');
    assert.lengthOf(values, 5);
    assert.match(values[0].textContent ?? '', /^JS heap: /);
    assert.strictEqual(values[4].textContent, '');

    canvasContainer.dispatchEvent(new MouseEvent('mouseleave'));
    await countersGraph.updateComplete;

    for (const marker of markers) {
      assert.isTrue(marker.hasAttribute('hidden'));
    }
    for (const value of values) {
      assert.strictEqual(value.textContent, '');
    }
  });

  it('redraws and hides counter values when a checkbox emits change', async function() {
    const {countersGraph} = await renderCountersGraphForMainThread(this, {width: 800, height: 200});
    countersGraph.onResize();
    await countersGraph.updateComplete;

    const drawSpy = sinon.spy(countersGraph, 'draw');
    const jsHeapCheckbox = countersGraph.element.querySelector<UI.UIUtils.CheckboxLabel>('devtools-checkbox');
    assert.exists(jsHeapCheckbox);
    assert.isTrue(jsHeapCheckbox.checked);

    const jsHeapValue = countersGraph.element.querySelector<HTMLElement>('#counter-values-bar .memory-counter-value');
    assert.exists(jsHeapValue);
    assert.isFalse(jsHeapValue.hasAttribute('hidden'));

    jsHeapCheckbox.checked = false;
    jsHeapCheckbox.dispatchEvent(new Event('change'));
    await countersGraph.updateComplete;

    sinon.assert.calledOnce(drawSpy);
    assert.isTrue(jsHeapValue.hasAttribute('hidden'));

    jsHeapCheckbox.checked = true;
    jsHeapCheckbox.dispatchEvent(new Event('change'));
    await countersGraph.updateComplete;
    assert.isFalse(jsHeapValue.hasAttribute('hidden'));
  });

  it('renders the counters graph screenshot', async function() {
    const {countersGraph, parsedTrace} = await renderCountersGraphForMainThread(this, {width: 800, height: 220});
    const {min} = parsedTrace.data.Meta.traceBounds;
    const interestingRange = Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(700));
    const max = Trace.Types.Timing.Micro(min + interestingRange);
    TraceBounds.TraceBounds.BoundsManager.instance().setTimelineVisibleWindow(microsecondsTraceWindow(min, max));
    countersGraph.onResize();
    await countersGraph.updateComplete;
    const canvasContainer = countersGraph.element.querySelector<HTMLElement>('#memory-graphs-canvas-container');
    assert.exists(canvasContainer);
    const rect = canvasContainer.getBoundingClientRect();
    canvasContainer.dispatchEvent(new MouseEvent('mousemove', {clientX: rect.left + 200}));
    await countersGraph.updateComplete;
    await raf();
    await assertScreenshot('timeline/counters_graph.png');
  });

  it('computes position in Calculator', () => {
    const calculator = new Timeline.CountersGraph.Calculator();
    calculator.setZeroTime(100);
    calculator.setWindow(100, 300);
    calculator.setDisplayWidth(200);
    assert.strictEqual(calculator.computePosition(200), 100);
  });

  it('computes visible sample bounds in Counter', () => {
    const calculator = new Timeline.CountersGraph.Calculator();
    calculator.setZeroTime(100);
    calculator.setWindow(100, 300);
    calculator.setDisplayWidth(200);

    const counter = new Timeline.CountersGraph.Counter();
    counter.appendSample(100, 10);
    counter.appendSample(200, 50);
    counter.appendSample(300, 30);
    counter.calculateVisibleIndexes(calculator);
    assert.deepEqual(counter.calculateBounds(), {min: 10, max: 50});
  });

  it('computes X coordinates in Counter', () => {
    const calculator = new Timeline.CountersGraph.Calculator();
    calculator.setZeroTime(100);
    calculator.setWindow(100, 300);
    calculator.setDisplayWidth(200);

    const counter = new Timeline.CountersGraph.Counter();
    counter.appendSample(100, 10);
    counter.appendSample(200, 50);
    counter.appendSample(300, 30);
    counter.calculateVisibleIndexes(calculator);
    counter.calculateXValues(200);
    assert.strictEqual(counter.x[1], 100);
    assert.strictEqual(counter.x[2], 200);
  });

  it('accepts an optional host element in its constructor', async () => {
    const hostElement = document.createElement('devtools-widget');
    const countersGraph = new Timeline.CountersGraph.CountersGraph(hostElement);
    renderElementIntoDOM(countersGraph);
    await countersGraph.updateComplete;
    assert.strictEqual(countersGraph.element, hostElement);
    assert.strictEqual(countersGraph.element.id, 'memory-graphs-container');
    countersGraph.detach();
  });

  it('delegates model setter assignments to setModel', async function() {
    const {countersGraph, parsedTrace} = await renderCountersGraphForMainThread(this);
    const setModelSpy = sinon.spy(countersGraph, 'setModel');
    const events: Trace.Types.Events.Event[] = [];

    countersGraph.model = {parsedTrace, events};
    sinon.assert.calledOnceWithExactly(setModelSpy, parsedTrace, events);
  });

  it('skips setModel when assigned an unchanged model', async function() {
    const {countersGraph, parsedTrace} = await renderCountersGraphForMainThread(this);
    const events: Trace.Types.Events.Event[] = [];
    countersGraph.model = {parsedTrace, events};

    const setModelSpy = sinon.spy(countersGraph, 'setModel');
    countersGraph.model = {parsedTrace, events};
    sinon.assert.notCalled(setModelSpy);
  });
});
