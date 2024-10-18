// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../../models/trace/trace.js';
import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {defaultTraceEvent} from '../../../testing/TraceHelpers.js';
import type * as PerfUI from '../../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Timeline from '../timeline.js';

describeWithEnvironment('AppenderUtils', () => {
  const defaultGroupStyle = {
    padding: 4,
    height: 17,
    collapsible: true,
    // This color is same as --sys-color-on-surface in themeColors.css
    color: 'rgb(31 31 31 / 100%)',
    // This color is same as --sys-color-cdt-base-container in themeColors.css
    backgroundColor: 'rgb(253 252 251 / 100%)',
    nestingLevel: 0,
    shareHeaderLine: true,
  };

  describe('buildGroupStyle', () => {
    it('builds default GroupStyle correctly', () => {
      const builtGroupStyle = Timeline.AppenderUtils.buildGroupStyle();
      assert.deepEqual(builtGroupStyle, defaultGroupStyle);
    });

    it('builds GroupStyle with customized fields correctly', () => {
      const gpuGroupStyle = {...defaultGroupStyle};
      gpuGroupStyle.shareHeaderLine = false;

      const builtGroupStyle = Timeline.AppenderUtils.buildGroupStyle({shareHeaderLine: false});
      assert.deepEqual(builtGroupStyle, gpuGroupStyle);
    });
  });

  describe('buildTrackHeader', () => {
    const trackHeader = {
      startLevel: 0,
      name: 'Header Name',
      style: defaultGroupStyle,
      selectable: true,
      expanded: true,
      showStackContextMenu: true,
      jslogContext: 'animations',
    } as PerfUI.FlameChart.Group;

    it('builds a track header correctly', () => {
      const builtHeader = Timeline.AppenderUtils.buildTrackHeader(
          Timeline.CompatibilityTracksAppender.VisualLoggingTrackName.ANIMATIONS,
          /* startLevel= */ 0, 'Header Name', Timeline.AppenderUtils.buildGroupStyle(), /* selectable= */ true,
          /* expanded= */ true, /* showStackContextMenu= */ true);
      assert.deepEqual(builtHeader, trackHeader);
    });
  });

  describe('getFormattedTime', () => {
    // Helper method. Treat input as milliseconds
    const getFormattedTime = (tot: number, self: number): string => {
      const totalTime = Trace.Helpers.Timing.millisecondsToMicroseconds(Trace.Types.Timing.MilliSeconds(tot));
      const selfTime = Trace.Helpers.Timing.millisecondsToMicroseconds(Trace.Types.Timing.MilliSeconds(self));
      return Timeline.AppenderUtils.getFormattedTime(totalTime, selfTime);
    };

    it('returns the time info for a entry with no duration correctly', async () => {
      const totalTime = Trace.Types.Timing.MicroSeconds(0);
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(totalTime);
      assert.strictEqual(formattedTime, '');

      const formattedTime2 = Timeline.AppenderUtils.getFormattedTime(undefined);
      assert.strictEqual(formattedTime2, '');
    });

    it('returns the time info for given total time correctly', async () => {
      const totalTime = Trace.Types.Timing.MicroSeconds(10000);
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(totalTime);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(formattedTime, '10.00\u00A0ms');
    });

    it('returns the time info for given total time and self time correctly', async () => {
      const totalTime = Trace.Types.Timing.MicroSeconds(10000);
      const selfTime = Trace.Types.Timing.MicroSeconds(1000);
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(totalTime, selfTime);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(formattedTime, '10.00\u00A0ms (self 1.00\u00A0ms)');
    });

    it('returns the time info for same total time and self time correctly', async () => {
      const totalTime = Trace.Types.Timing.MicroSeconds(10000);
      const selfTime = Trace.Types.Timing.MicroSeconds(10000);
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(totalTime, selfTime);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(formattedTime, '10.00\u00A0ms');
    });

    it('has appropriate rounding', () => {
      assert.strictEqual(getFormattedTime(10, 9), '10.00\u00A0ms (self 9.00\u00A0ms)');
      assert.strictEqual(getFormattedTime(10, 9.99), '10.00\u00A0ms (self 9.99\u00A0ms)');
      assert.strictEqual(getFormattedTime(10, 9.999), '10.00\u00A0ms (self 10.00\u00A0ms)');
      assert.strictEqual(getFormattedTime(10, 9.9999), '10.00\u00A0ms (self 10.00\u00A0ms)');

      assert.strictEqual(getFormattedTime(8.9, 7), '8.90\u00A0ms (self 7.00\u00A0ms)');
      assert.strictEqual(getFormattedTime(8.99, 7), '8.99\u00A0ms (self 7.00\u00A0ms)');
      assert.strictEqual(getFormattedTime(8.999, 7), '9.00\u00A0ms (self 7.00\u00A0ms)');
    });

    it('selfTime is omitted if we hit minSignificance', async () => {
      // Total and self are really close
      assert.strictEqual(getFormattedTime(5, 5.00001), '5.00\u00A0ms (self 5.00\u00A0ms)');
      assert.strictEqual(getFormattedTime(5, 5.000001), '5.00\u00A0ms (self 5.00\u00A0ms)');
      assert.strictEqual(getFormattedTime(5, 5.0000001), '5.00\u00A0ms');  // minSignificance hit!

      // The self is almost zero
      assert.strictEqual(getFormattedTime(10, 0.1), '10.00\u00A0ms (self 0.10\u00A0ms)');
      assert.strictEqual(getFormattedTime(10, 0.01), '10.00\u00A0ms (self 10\u00A0μs)');
      assert.strictEqual(getFormattedTime(10, 0.001), '10.00\u00A0ms (self 1\u00A0μs)');
      assert.strictEqual(getFormattedTime(10, 0.0001), '10.00\u00A0ms (self 0\u00A0μs)');
      assert.strictEqual(getFormattedTime(10, 0.00001), '10.00\u00A0ms (self 0\u00A0μs)');
      assert.strictEqual(getFormattedTime(10, 0.000001), '10.00\u00A0ms');  // minSignificance hit!
    });
  });

  describe('getEventLevel', () => {
    it('returns the level for async events correctly', async () => {
      const lastTimestampByLevel: Timeline.AppenderUtils.LastTimestampByLevel = [];
      const eventOne = {
        ...defaultTraceEvent,
        ts: Trace.Types.Timing.MicroSeconds(0),
        dur: Trace.Types.Timing.MicroSeconds(10),
      };
      const eventTwo = {
        ...defaultTraceEvent,
        ts: Trace.Types.Timing.MicroSeconds(5),
        dur: Trace.Types.Timing.MicroSeconds(10),
      };
      const eventThree = {
        ...defaultTraceEvent,
        ts: Trace.Types.Timing.MicroSeconds(20),
        dur: Trace.Types.Timing.MicroSeconds(10),
      };

      let level = Timeline.AppenderUtils.getEventLevel(eventOne, lastTimestampByLevel);
      // For first event, the track is empty, so it always returns 0.
      assert.strictEqual(level, 0);

      level = Timeline.AppenderUtils.getEventLevel(eventTwo, lastTimestampByLevel);
      // For eventTwo, its start time is smaller than eventOne's end time, so it should be appended to level 1.
      assert.strictEqual(level, 1);

      level = Timeline.AppenderUtils.getEventLevel(eventThree, lastTimestampByLevel);
      // For eventThree, it doesn't overlap with eventOne, so it can fit in level 0.
      assert.strictEqual(level, 0);
    });

    it('returns the level for sync events correctly', async () => {
      const lastTimestampByLevel: Timeline.AppenderUtils.LastTimestampByLevel = [];
      const eventOne = {
        ...defaultTraceEvent,
        ts: Trace.Types.Timing.MicroSeconds(0),
        dur: Trace.Types.Timing.MicroSeconds(30),
      };
      const eventTwo = {
        ...defaultTraceEvent,
        ts: Trace.Types.Timing.MicroSeconds(5),
        dur: Trace.Types.Timing.MicroSeconds(10),
      };
      const eventThree = {
        ...defaultTraceEvent,
        ts: Trace.Types.Timing.MicroSeconds(10),
        dur: Trace.Types.Timing.MicroSeconds(2),
      };
      const eventFour = {
        ...defaultTraceEvent,
        ts: Trace.Types.Timing.MicroSeconds(20),
        dur: Trace.Types.Timing.MicroSeconds(10),
      };

      let level = Timeline.AppenderUtils.getEventLevel(eventOne, lastTimestampByLevel);
      // For first event, the track is empty, so it always returns 0.
      assert.strictEqual(level, 0);

      level = Timeline.AppenderUtils.getEventLevel(eventTwo, lastTimestampByLevel);
      // For eventTwo, its time is a subset of the eventOne, so it will be append as eventOne's child.
      assert.strictEqual(level, 1);

      level = Timeline.AppenderUtils.getEventLevel(eventThree, lastTimestampByLevel);
      // For eventTwo, its time is a subset of the eventTwo, so it will be append as eventTwo's child.
      assert.strictEqual(level, 2);

      level = Timeline.AppenderUtils.getEventLevel(eventFour, lastTimestampByLevel);
      // For eventFour, its time is a subset of eventOne but not eventTwo, so it will be append as eventTwo's child.
      assert.strictEqual(level, 1);
    });
  });
});
