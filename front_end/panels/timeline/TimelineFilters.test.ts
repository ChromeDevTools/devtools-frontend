// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {getMainThread} from '../../testing/TraceHelpers.js';
import {TraceLoader} from '../../testing/TraceLoader.js';

import * as Timeline from './timeline.js';

describeWithEnvironment('TimelineFilters', () => {
  describe('IsLong', () => {
    it('returns true if the event is longer than the defined duration for a new engine event', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
      const longEvent = getMainThread(data.Renderer).entries.find(event => {
        return event.dur && event.dur > Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(50));
      });
      if (!longEvent) {
        throw new Error('Could not find expected long event.');
      }

      const filter = new Timeline.TimelineFilters.IsLong();
      filter.setMinimumRecordDuration(Trace.Types.Timing.Milli(50));
      assert.isTrue(filter.accept(longEvent));
    });

    it('returns false if the event is shorter than the defined duration for a new engine event', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'one-second-interaction.json.gz');
      const longEvent = getMainThread(data.Renderer).entries.find(event => {
        return event.dur && event.dur > Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(50)) &&
            event.dur < Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(100));
      });
      if (!longEvent) {
        throw new Error('Could not find expected long event.');
      }

      const filter = new Timeline.TimelineFilters.IsLong();
      filter.setMinimumRecordDuration(Trace.Types.Timing.Milli(101));
      assert.isFalse(filter.accept(longEvent));
    });
  });

  describe('Category', () => {
    it('returns false for a new event if it has a category that is hidden', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      // These events are usually visible, so make the category hidden before
      // running this test.
      Trace.Styles.getCategoryStyles()['scripting'].hidden = true;

      const userTimingEvent = data.UserTimings.performanceMeasures.at(0);
      if (!userTimingEvent) {
        throw new Error('Could not find expected event.');
      }
      const filter = new Timeline.TimelineFilters.Category();
      assert.isFalse(filter.accept(userTimingEvent));
      Trace.Styles.getCategoryStyles()['scripting'].hidden = false;
    });

    it('returns true for a new event if it has a category that is visible', async function() {
      const {data} = await TraceLoader.traceEngine(this, 'user-timings.json.gz');
      const userTimingEvent = data.UserTimings.performanceMeasures.at(0);
      if (!userTimingEvent) {
        throw new Error('Could not find expected event.');
      }
      const filter = new Timeline.TimelineFilters.Category();
      assert.isTrue(filter.accept(userTimingEvent));
      Trace.Styles.getCategoryStyles()['scripting'].hidden = false;
    });
  });
});
