// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import {TraceLoader} from '../../../helpers/TraceLoader.js';

const {assert} = chai;

describeWithEnvironment('NetworkTrackAppender', function() {
  let traceParsedData: TraceEngine.Handlers.Types.TraceParseData;
  let networkTrackAppender: Timeline.NetworkTrackAppender.NetworkTrackAppender;
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();

  beforeEach(async function() {
    traceParsedData = await TraceLoader.traceEngine(this, 'cls-cluster-max-timeout.json.gz');
    networkTrackAppender = new Timeline.NetworkTrackAppender.NetworkTrackAppender(traceParsedData, flameChartData);
    networkTrackAppender.appendTrackAtLevel(0);
  });

  afterEach(() => {
    flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();
  });

  describe('appendTrackAtLevel', function() {
    it('creates a flamechart group for the Network track', function() {
      assert.strictEqual(flameChartData.groups.length, 1);
      assert.strictEqual(flameChartData.groups[0].name, 'Network');
    });

    it('adds start times correctly', function() {
      const networkRequests = traceParsedData.NetworkRequests.byTime;
      for (let i = 0; i < networkRequests.length; ++i) {
        const event = networkRequests[i];
        assert.strictEqual(
            flameChartData.entryStartTimes[i], TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });

    it('adds total times correctly', function() {
      const networkRequests = traceParsedData.NetworkRequests.byTime;
      for (let i = 0; i < networkRequests.length; i++) {
        const event = networkRequests[i];
        if (TraceEngine.Handlers.ModelHandlers.PageLoadMetrics.isTraceEventMarkerEvent(event)) {
          assert.isNaN(flameChartData.entryTotalTimes[i]);
          continue;
        }
        const expectedTotalTimeForEvent = event.dur ?
            TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.dur as TraceEngine.Types.Timing.MicroSeconds) :
            Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
        assert.strictEqual(flameChartData.entryTotalTimes[i], expectedTotalTimeForEvent);
      }
    });
  });

  describe('colorForEvent and titleForEvent', function() {
    it('returns the correct color and title for GPU tasks', function() {
      const networkRequests = traceParsedData.NetworkRequests.byTime;
      for (const event of networkRequests) {
        assert.strictEqual(networkTrackAppender.titleForEvent(event), event.name);
        const category = Timeline.TimelineUIUtils.TimelineUIUtils.syntheticNetworkRequestCategory(event);
        assert.strictEqual(
            networkTrackAppender.colorForEvent(event),
            Timeline.TimelineUIUtils.TimelineUIUtils.networkCategoryColor(category));
      }
    });
  });

  describe('highlightedEntryInfo', function() {
    it('returns the info for a entry correctly', function() {
      const networkRequests = traceParsedData.NetworkRequests.byTime;
      const highlightedEntryInfo = networkTrackAppender.highlightedEntryInfo(networkRequests[0]);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, '286.21\u00A0ms');
    });
  });
});
