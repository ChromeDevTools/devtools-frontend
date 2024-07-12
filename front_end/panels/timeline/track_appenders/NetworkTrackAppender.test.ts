// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as TimelineComponents from '../components/components.js';
import * as Timeline from '../timeline.js';

describeWithEnvironment('NetworkTrackAppender', function() {
  let traceData: TraceEngine.Handlers.Types.TraceParseData;
  let networkTrackAppender: Timeline.NetworkTrackAppender.NetworkTrackAppender;
  let flameChartData = PerfUI.FlameChart.FlameChartTimelineData.createEmpty();

  beforeEach(async function() {
    ({traceData} = await TraceLoader.traceEngine(this, 'cls-cluster-max-timeout.json.gz'));
    networkTrackAppender =
        new Timeline.NetworkTrackAppender.NetworkTrackAppender(flameChartData, traceData.NetworkRequests.byTime);
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
      const networkRequests = traceData.NetworkRequests.byTime;
      for (let i = 0; i < networkRequests.length; ++i) {
        const event = networkRequests[i];
        assert.strictEqual(
            flameChartData.entryStartTimes[i], TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.ts));
      }
    });

    it('adds total times correctly', function() {
      const networkRequests = traceData.NetworkRequests.byTime;
      for (let i = 0; i < networkRequests.length; i++) {
        const event = networkRequests[i];
        if (TraceEngine.Types.TraceEvents.isTraceEventMarkerEvent(event)) {
          assert.isNaN(flameChartData.entryTotalTimes[i]);
          continue;
        }
        const expectedTotalTimeForEvent = event.dur ?
            TraceEngine.Helpers.Timing.microSecondsToMilliseconds(event.dur) :
            Timeline.TimelineFlameChartDataProvider.InstantEventVisibleDurationMs;
        assert.strictEqual(flameChartData.entryTotalTimes[i], expectedTotalTimeForEvent);
      }
    });
  });

  describe('colorForEvent and titleForEvent', function() {
    it('returns the correct color and title for GPU tasks', function() {
      const networkRequests = traceData.NetworkRequests.byTime;
      for (const event of networkRequests) {
        assert.strictEqual(networkTrackAppender.titleForEvent(event), event.name);
        const color = TimelineComponents.Utils.colorForNetworkRequest(event);
        assert.strictEqual(networkTrackAppender.colorForEvent(event), color);
      }
    });
  });

  describe('highlightedEntryInfo', function() {
    it('returns the info for a entry correctly', function() {
      const networkRequests = traceData.NetworkRequests.byTime;
      const highlightedEntryInfo = networkTrackAppender.highlightedEntryInfo(networkRequests[0]);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(highlightedEntryInfo.formattedTime, '286.21\u00A0ms');
    });
  });
});
