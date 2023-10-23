// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import type * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

const {assert} = chai;

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  selection: Timeline.TimelineSelection.TimelineSelection|null = null;
  select(selection: Timeline.TimelineSelection.TimelineSelection|null): void {
    this.selection = selection;
  }
  selectEntryAtTime(_events: TraceEngine.Legacy.Event[]|null, _time: number): void {
  }
  highlightEvent(_event: TraceEngine.Legacy.Event|null): void {
  }
}

describeWithEnvironment('TimelineFlameChartView', function() {
  // TODO(crbug.com/1492405): Improve perf panel trace load speed to
  // prevent timeout bump.
  this.timeout(20_000);
  it('Can search for events by name in the timeline', async function() {
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'lcp-images.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
    flameChartView.setSearchableView(searchableView);
    flameChartView.setModel(performanceModel, traceParsedData);

    const searchQuery = 'Paint';
    const searchConfig =
        new UI.SearchableView.SearchConfig(/* query */ searchQuery, /* caseSensitive */ false, /* isRegex */ false);
    flameChartView.performSearch(searchConfig, true);

    assert.strictEqual(flameChartView.getSearchResults()?.length, 35);
    assertSelectionName('PrePaint');

    flameChartView.jumpToNextSearchResult();
    assertSelectionName('PrePaint');

    flameChartView.jumpToNextSearchResult();
    assertSelectionName('Paint');

    flameChartView.jumpToPreviousSearchResult();
    assertSelectionName('PrePaint');
    flameChartView.jumpToPreviousSearchResult();
    assertSelectionName('PrePaint');

    function assertSelectionName(name: string) {
      const selection = mockViewDelegate.selection;
      if (!selection || !Timeline.TimelineSelection.TimelineSelection.isTraceEventSelection(selection.object)) {
        throw new Error('Selection is not present or not a Trace Event');
      }
      const object = selection.object;
      assert.strictEqual(object.name, name);
    }
  });

  // This test is still failing after bumping up the timeout to 20 seconds. So
  // skip it while we work on a fix for the trace load speed.
  it.skip('[crbug.com/1492405] Shows the network track correctly', async function() {
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'load-simple.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(performanceModel, traceParsedData);

    assert.isTrue(flameChartView.isNetworkTrackShownForTests());
  });

  it('Does not show the network track when there is no network request', async function() {
    const {traceParsedData, performanceModel} = await TraceLoader.allModels(this, 'basic.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    flameChartView.setModel(performanceModel, traceParsedData);

    assert.isFalse(flameChartView.isNetworkTrackShownForTests());
  });
});
