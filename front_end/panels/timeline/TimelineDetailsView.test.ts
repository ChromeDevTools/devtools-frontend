// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import * as Trace from '../../models/trace/trace.js';
import {doubleRaf} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  select(_selection: Timeline.TimelineSelection.TimelineSelection|null): void {
  }
  selectEntryAtTime(_events: Trace.Types.Events.Event[]|null, _time: number): void {
  }
  highlightEvent(_event: Trace.Types.Events.Event|null): void {
  }
  element = document.createElement('div');
}

describeWithEnvironment('TimelineDetailsView', function() {
  const mockViewDelegate = new MockViewDelegate();

  it('displays the details of a network request event correctly', async function() {
    const {parsedTrace, insights} = await TraceLoader.traceEngine(this, 'lcp-web-font.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsView(mockViewDelegate);

    const networkRequests = parsedTrace.NetworkRequests.byTime;
    const cssRequest = networkRequests.find(request => {
      return request.args.data.url === 'https://chromedevtools.github.io/performance-stories/lcp-web-font/app.css';
    });
    if (!cssRequest) {
      throw new Error('Could not find expected network request.');
    }
    const selection = Timeline.TimelineSelection.selectionFromEvent(cssRequest);

    await detailsView.setModel(
        {parsedTrace, selectedEvents: null, traceInsightsSets: insights, eventToRelatedInsightsMap: null});
    await detailsView.setSelection(selection);

    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    // NetworkRequestDetails and RelatedInsightsChips nodes.
    assert.strictEqual(detailsContentElement.childNodes.length, 2);
  });

  it('displays the details for a frame correctly', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsView(mockViewDelegate);
    await detailsView.setModel(
        {parsedTrace, selectedEvents: null, traceInsightsSets: null, eventToRelatedInsightsMap: null});

    const frame = parsedTrace.Frames.frames.at(0);
    assert.isOk(frame);
    const selection = Timeline.TimelineSelection.selectionFromEvent(frame);
    await detailsView.setSelection(selection);
    await doubleRaf();  // to let the image be fetched + rendered.
    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    const frameImg = detailsContentElement.querySelector('.timeline-filmstrip-preview img');
    assert.instanceOf(frameImg, HTMLImageElement);
    assert.isDefined(frameImg.src);

    const duration = detailsContentElement.querySelector<HTMLElement>('[data-row-title="Duration"]');
    assert.isOk(duration);
    assert.strictEqual(duration.innerText, 'Duration37.85 ms (at 109.82 ms)');
  });

  it('renders the layout shift component for a single layout shift', async function() {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.TIMELINE_INSIGHTS);

    const {parsedTrace} = await TraceLoader.traceEngine(this, 'shift-attribution.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsView(mockViewDelegate);
    await detailsView.setModel(
        {parsedTrace, selectedEvents: null, traceInsightsSets: null, eventToRelatedInsightsMap: null});

    const layoutShift = parsedTrace.LayoutShifts.clusters.at(0)?.events.at(0);
    assert.isOk(layoutShift);
    const selection = Timeline.TimelineSelection.selectionFromEvent(layoutShift);
    await detailsView.setSelection(selection);
    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    // Assert that the right component is rendered. This component has its own
    // tests for its contents so no need to duplicate those here.
    const layoutShiftDetails = detailsContentElement.querySelector('devtools-performance-layout-shift-details');
    assert.isNotNull(layoutShiftDetails);
  });

  it('renders the layout shift component for a selected cluster', async function() {
    Root.Runtime.experiments.enableForTest(Root.Runtime.ExperimentName.TIMELINE_INSIGHTS);

    const {parsedTrace} = await TraceLoader.traceEngine(this, 'shift-attribution.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsView(mockViewDelegate);
    await detailsView.setModel(
        {parsedTrace, selectedEvents: null, traceInsightsSets: null, eventToRelatedInsightsMap: null});

    const layoutShiftCluster = parsedTrace.LayoutShifts.clusters.at(0);
    assert.isOk(layoutShiftCluster);
    const selection = Timeline.TimelineSelection.selectionFromEvent(layoutShiftCluster);
    await detailsView.setSelection(selection);
    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    // Assert that the right component is rendered. This component has its own
    // tests for its contents so no need to duplicate those here.
    const layoutShiftDetails = detailsContentElement.querySelector('devtools-performance-layout-shift-details');
    assert.isNotNull(layoutShiftDetails);
  });

  it('updates the range details when the user has a range selected', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsView(mockViewDelegate);
    await detailsView.setModel({
      parsedTrace,
      // We have to set selected events for the range selection UI to be drawn
      // (without the set of events we can't generate the range stats)
      selectedEvents: parsedTrace.Renderer.allTraceEntries,
      traceInsightsSets: null,
      eventToRelatedInsightsMap: null,
    });
    const bounds = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.Meta.traceBounds);
    const selection = Timeline.TimelineSelection.selectionFromRangeMilliSeconds(
        bounds.min,
        bounds.max,
    );
    await detailsView.setSelection(selection);
    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    const title = detailsContentElement.querySelector<HTMLElement>('.timeline-details-chip-title');
    assert.strictEqual(title?.innerText, 'Range:  0 ms – 5.39 s');
  });
});
