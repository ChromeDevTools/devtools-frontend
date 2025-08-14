// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import {doubleRaf, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {allThreadEntriesInTrace} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import type * as Components from './components/components.js';
import * as Timeline from './timeline.js';

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  select(_selection: Timeline.TimelineSelection.TimelineSelection|null): void {
  }
  set3PCheckboxDisabled(_disabled: boolean): void {
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
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsPane(mockViewDelegate);

    renderElementIntoDOM(detailsView);

    const networkRequests = parsedTrace.NetworkRequests.byTime;
    const cssRequest = networkRequests.find(request => {
      return request.args.data.url === 'https://chromedevtools.github.io/performance-stories/lcp-web-font/app.css';
    });
    if (!cssRequest) {
      throw new Error('Could not find expected network request.');
    }
    const selection = Timeline.TimelineSelection.selectionFromEvent(cssRequest);

    // Set up a related insight to test the rendering of the chips
    const relatedInsights: Components.RelatedInsightChips.EventToRelatedInsightsMap = new Map([
      [cssRequest, [{insightLabel: 'Test insight', activateInsight: () => {}, messages: []}]],
    ]);

    await detailsView.setModel({
      parsedTrace,
      selectedEvents: null,
      traceInsightsSets: insights,
      eventToRelatedInsightsMap: relatedInsights,
      entityMapper: null
    });
    await detailsView.setSelection(selection);
    await raf();

    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    assert.isNotNull(detailsContentElement.querySelector('[data-network-request-details]'));
  });

  it('displays the details for a frame correctly', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsPane(mockViewDelegate);
    renderElementIntoDOM(detailsView);
    await detailsView.setModel({
      parsedTrace,
      selectedEvents: null,
      traceInsightsSets: null,
      eventToRelatedInsightsMap: null,
      entityMapper: null
    });

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
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'shift-attribution.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsPane(mockViewDelegate);
    renderElementIntoDOM(detailsView);
    await detailsView.setModel({
      parsedTrace,
      selectedEvents: null,
      traceInsightsSets: null,
      eventToRelatedInsightsMap: null,
      entityMapper: null
    });

    const layoutShift = parsedTrace.LayoutShifts.clusters.at(0)?.events.at(0);
    assert.isOk(layoutShift);
    const selection = Timeline.TimelineSelection.selectionFromEvent(layoutShift);
    await detailsView.setSelection(selection);
    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    // Assert that the right component is rendered. This component has its own
    // tests for its contents so no need to duplicate those here.
    const layoutShiftDetails = detailsContentElement.querySelector('[data-layout-shift-details]');
    assert.isNotNull(layoutShiftDetails);
  });

  it('renders the layout shift component for a selected cluster', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'shift-attribution.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsPane(mockViewDelegate);
    renderElementIntoDOM(detailsView);
    await detailsView.setModel({
      parsedTrace,
      selectedEvents: null,
      traceInsightsSets: null,
      eventToRelatedInsightsMap: null,
      entityMapper: null
    });

    const layoutShiftCluster = parsedTrace.LayoutShifts.clusters.at(0);
    assert.isOk(layoutShiftCluster);
    const selection = Timeline.TimelineSelection.selectionFromEvent(layoutShiftCluster);
    await detailsView.setSelection(selection);
    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    // Assert that the right component is rendered. This component has its own
    // tests for its contents so no need to duplicate those here.
    const layoutShiftDetails = detailsContentElement.querySelector('[data-layout-shift-details]');
    assert.isNotNull(layoutShiftDetails);
  });

  it('renders information for a generic event on the main thread', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsPane(mockViewDelegate);
    renderElementIntoDOM(detailsView);
    const evalScriptEvent = allThreadEntriesInTrace(parsedTrace).find(event => {
      return event.name === Trace.Types.Events.Name.EVALUATE_SCRIPT && event.dur && event.dur > 2000;
    });
    assert.isOk(evalScriptEvent);
    await detailsView.setModel({
      parsedTrace,
      selectedEvents: null,
      traceInsightsSets: null,
      eventToRelatedInsightsMap: null,
      entityMapper: null
    });
    const selection = Timeline.TimelineSelection.selectionFromEvent(evalScriptEvent);
    await detailsView.setSelection(selection);
    const detailsContentElement = detailsView.getDetailsContentElementForTest();

    assert.strictEqual(
        detailsContentElement.querySelector<HTMLElement>('.timeline-details-chip-title')?.innerText, 'Evaluate script');

    // Ensure we show the pie chart time breakdown
    assert.isTrue(detailsContentElement.innerText.includes('Aggregated time'));
  });

  it('updates the range details when the user has a range selected', async function() {
    const {parsedTrace} = await TraceLoader.traceEngine(this, 'web-dev-with-commit.json.gz');
    const detailsView = new Timeline.TimelineDetailsView.TimelineDetailsPane(mockViewDelegate);
    renderElementIntoDOM(detailsView);
    await detailsView.setModel({
      parsedTrace,
      // We have to set selected events for the range selection UI to be drawn
      // (without the set of events we can't generate the range stats)
      selectedEvents: allThreadEntriesInTrace(parsedTrace),
      traceInsightsSets: null,
      eventToRelatedInsightsMap: null,
      entityMapper: null
    });
    const bounds = Trace.Helpers.Timing.traceWindowMilliSeconds(parsedTrace.Meta.traceBounds);
    const selection = Timeline.TimelineSelection.selectionFromRangeMilliSeconds(
        bounds.min,
        bounds.max,
    );
    await detailsView.setSelection(selection);
    await raf();

    const detailsContentElement = detailsView.getDetailsContentElementForTest();
    const component = detailsContentElement.querySelector<HTMLElement>('devtools-performance-timeline-summary');
    const range = component?.shadowRoot?.querySelector<HTMLElement>('.summary-range');
    assert.strictEqual(range?.innerText, 'Range: 0 ms – 5.39 s');
  });
});
