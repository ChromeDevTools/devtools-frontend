// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';
import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {getMainThread} from '../../helpers/TraceHelpers.js';
import {TraceLoader} from '../../helpers/TraceLoader.js';

describeWithEnvironment('TimelineFilters', () => {
  function getAllSDKEvents(tracingModel: TraceEngine.Legacy.TracingModel): TraceEngine.Legacy.Event[] {
    return tracingModel.sortedProcesses().flatMap(process => {
      return process.sortedThreads().flatMap(thread => thread.events());
    });
  }

  describe('IsLong', () => {
    it('returns true if the event is longer than the defined duration for a legacy trace event', async function() {
      const models = await TraceLoader.allModels(this, 'one-second-interaction.json.gz');
      const longEvent = getAllSDKEvents(models.tracingModel).find(event => {
        return event.duration && event.duration > 50;
      });
      if (!longEvent) {
        throw new Error('Could not find expected long event.');
      }

      const filter = new Timeline.TimelineFilters.IsLong();
      filter.setMinimumRecordDuration(TraceEngine.Types.Timing.MilliSeconds(50));
      assert.isTrue(filter.accept(longEvent));
    });

    it('returns false if the event is shorter than the duration for a legacy event', async function() {
      const models = await TraceLoader.allModels(this, 'react-hello-world.json.gz');
      const longEvent = getAllSDKEvents(models.tracingModel).find(event => {
        return event.duration && event.duration > 50 && event.duration < 100;
      });
      if (!longEvent) {
        throw new Error('Could not find expected long event.');
      }

      const filter = new Timeline.TimelineFilters.IsLong();
      filter.setMinimumRecordDuration(TraceEngine.Types.Timing.MilliSeconds(101));
      assert.isFalse(filter.accept(longEvent));
    });

    it('returns true if the event is longer than the defined duration for a new engine event', async function() {
      const models = await TraceLoader.allModels(this, 'one-second-interaction.json.gz');
      const longEvent = getMainThread(models.traceParsedData.Renderer).entries.find(event => {
        return event.dur &&
            event.dur >
            TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(50));
      });
      if (!longEvent) {
        throw new Error('Could not find expected long event.');
      }

      const filter = new Timeline.TimelineFilters.IsLong();
      filter.setMinimumRecordDuration(TraceEngine.Types.Timing.MilliSeconds(50));
      assert.isTrue(filter.accept(longEvent));
    });

    it('returns false if the event is shorter than the defined duration for a new engine event', async function() {
      const models = await TraceLoader.allModels(this, 'one-second-interaction.json.gz');
      const longEvent = getMainThread(models.traceParsedData.Renderer).entries.find(event => {
        return event.dur &&
            event.dur >
            TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(50)) &&
            event.dur <
            TraceEngine.Helpers.Timing.millisecondsToMicroseconds(TraceEngine.Types.Timing.MilliSeconds(100));
      });
      if (!longEvent) {
        throw new Error('Could not find expected long event.');
      }

      const filter = new Timeline.TimelineFilters.IsLong();
      filter.setMinimumRecordDuration(TraceEngine.Types.Timing.MilliSeconds(101));
      assert.isFalse(filter.accept(longEvent));
    });
  });

  describe('Category', () => {
    it('returns false for a legacy event if it has a category that is hidden', async function() {
      const models = await TraceLoader.allModels(this, 'user-timings.json.gz');
      // These events are usually visible, so make the category hidden before
      // running this test.
      Timeline.TimelineUIUtils.TimelineUIUtils.categories()['scripting'].hidden = true;

      const userTimingEvent = (models.traceParsedData.UserTimings.performanceMeasures).at(0);
      if (!userTimingEvent) {
        throw new Error('Could not find expected event.');
      }
      const process = models.tracingModel.getProcessById(userTimingEvent.pid);
      const thread = process?.threadById(userTimingEvent.tid);
      if (!thread) {
        throw new Error();
      }
      const legacyEvent = TraceEngine.Legacy.PayloadEvent.fromPayload(
          userTimingEvent as unknown as TraceEngine.TracingManager.EventPayload, thread);

      const filter = new Timeline.TimelineFilters.Category();
      assert.isFalse(filter.accept(legacyEvent));
      Timeline.TimelineUIUtils.TimelineUIUtils.categories()['scripting'].hidden = false;
    });

    it('returns true for a legacy event if it has a category that is visible', async function() {
      const models = await TraceLoader.allModels(this, 'user-timings.json.gz');
      // This event is assigned the "scripting" category which is visible by default.
      const userTimingEvent = (models.traceParsedData.UserTimings.performanceMeasures).at(0);
      if (!userTimingEvent) {
        throw new Error('Could not find expected event.');
      }
      const process = models.tracingModel.getProcessById(userTimingEvent.pid);
      const thread = process?.threadById(userTimingEvent.tid);
      if (!thread) {
        throw new Error();
      }
      const legacyEvent = TraceEngine.Legacy.PayloadEvent.fromPayload(
          userTimingEvent as unknown as TraceEngine.TracingManager.EventPayload, thread);

      const filter = new Timeline.TimelineFilters.Category();
      assert.isTrue(filter.accept(legacyEvent));
    });

    it('returns false for a new event if it has a category that is hidden', async function() {
      const models = await TraceLoader.allModels(this, 'user-timings.json.gz');
      // These events are usually visible, so make the category hidden before
      // running this test.
      Timeline.TimelineUIUtils.TimelineUIUtils.categories()['scripting'].hidden = true;

      const userTimingEvent = (models.traceParsedData.UserTimings.performanceMeasures).at(0);
      if (!userTimingEvent) {
        throw new Error('Could not find expected event.');
      }
      const filter = new Timeline.TimelineFilters.Category();
      assert.isFalse(filter.accept(userTimingEvent));
      Timeline.TimelineUIUtils.TimelineUIUtils.categories()['scripting'].hidden = false;
    });

    it('returns true for a new event if it has a category that is visible', async function() {
      const models = await TraceLoader.allModels(this, 'user-timings.json.gz');
      const userTimingEvent = (models.traceParsedData.UserTimings.performanceMeasures).at(0);
      if (!userTimingEvent) {
        throw new Error('Could not find expected event.');
      }
      const filter = new Timeline.TimelineFilters.Category();
      assert.isTrue(filter.accept(userTimingEvent));
      Timeline.TimelineUIUtils.TimelineUIUtils.categories()['scripting'].hidden = false;
    });
  });
});
