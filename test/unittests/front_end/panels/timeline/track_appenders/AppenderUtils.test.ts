// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as PerfUI from '../../../../../../front_end/ui/legacy/components/perf_ui/perf_ui.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';
import * as Timeline from '../../../../../../front_end/panels/timeline/timeline.js';
import {defaultTraceEvent} from '../../../helpers/TraceHelpers.js';
import * as TraceEngine from '../../../../../../front_end/models/trace/trace.js';

const {assert} = chai;

describeWithEnvironment('AppenderUtils', () => {
  const defaultGroupStyle = {
    padding: 4,
    height: 17,
    collapsible: true,
    // This color is same as --sys-color-on-surface in themeColors.css
    color: 'rgb(31 31 31 / 100%)',
    // This color is same as --sys-color-cdt-base-container in themeColors.css
    backgroundColor: 'rgb(255 255 255 / 100%)',
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
    } as PerfUI.FlameChart.Group;

    it('builds a track header correctly', () => {
      const builtHeader = Timeline.AppenderUtils.buildTrackHeader(
          /* startLevel= */ 0, 'Header Name', Timeline.AppenderUtils.buildGroupStyle(), /* selectable= */ true,
          /* expanded= */ true, /* track= */ null, /* showStackContextMenu= */ true);
      assert.deepEqual(builtHeader, trackHeader);
    });
  });

  describe('getFormattedTime', () => {
    it('returns the time info for a entry with no duration correctly', async () => {
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(defaultTraceEvent.dur);
      assert.strictEqual(formattedTime, '');
    });

    it('returns the time info for given total time correctly', async () => {
      const totalTime = TraceEngine.Types.Timing.MicroSeconds(10000);
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(totalTime);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(formattedTime, '10.00\u00A0ms');
    });

    it('returns the time info for given total time and self time correctly', async () => {
      const totalTime = TraceEngine.Types.Timing.MicroSeconds(10000);
      const selfTime = TraceEngine.Types.Timing.MicroSeconds(1000);
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(totalTime, selfTime);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(formattedTime, '10.00\u00A0ms (self 1.00\u00A0ms)');
    });

    it('returns the time info for same total time and self time correctly', async () => {
      const totalTime = TraceEngine.Types.Timing.MicroSeconds(10000);
      const selfTime = TraceEngine.Types.Timing.MicroSeconds(10000);
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(totalTime, selfTime);
      // The i18n encodes spaces using the u00A0 unicode character.
      assert.strictEqual(formattedTime, '10.00\u00A0ms');
    });
  });

  describe('getEventLevel', () => {
    it('returns the level for async events correctly', async () => {
      const lastUsedTimeByLevel: number[] = [];
      const eventOne = {
        ...defaultTraceEvent,
        ts: TraceEngine.Types.Timing.MicroSeconds(0),
        dur: TraceEngine.Types.Timing.MicroSeconds(10),
      };
      const eventTwo = {
        ...defaultTraceEvent,
        ts: TraceEngine.Types.Timing.MicroSeconds(5),
        dur: TraceEngine.Types.Timing.MicroSeconds(10),
      };
      const eventThree = {
        ...defaultTraceEvent,
        ts: TraceEngine.Types.Timing.MicroSeconds(20),
        dur: TraceEngine.Types.Timing.MicroSeconds(10),
      };

      let level = Timeline.AppenderUtils.getEventLevel(eventOne, lastUsedTimeByLevel);
      // For first event, the track is empty, so it always returns 0.
      assert.strictEqual(level, 0);

      level = Timeline.AppenderUtils.getEventLevel(eventTwo, lastUsedTimeByLevel);
      // For eventTwo, its start time is smaller than eventOne's end time, so it should be appended to level 1.
      assert.strictEqual(level, 1);

      level = Timeline.AppenderUtils.getEventLevel(eventThree, lastUsedTimeByLevel);
      // For eventThree, it doesn't overlap with eventOne, so it can fit in level 0.
      assert.strictEqual(level, 0);
    });

    it('returns the level for sync events correctly', async () => {
      const lastUsedTimeByLevel: number[] = [];
      const eventOne = {
        ...defaultTraceEvent,
        ts: TraceEngine.Types.Timing.MicroSeconds(0),
        dur: TraceEngine.Types.Timing.MicroSeconds(30),
      };
      const eventTwo = {
        ...defaultTraceEvent,
        ts: TraceEngine.Types.Timing.MicroSeconds(5),
        dur: TraceEngine.Types.Timing.MicroSeconds(10),
      };
      const eventThree = {
        ...defaultTraceEvent,
        ts: TraceEngine.Types.Timing.MicroSeconds(10),
        dur: TraceEngine.Types.Timing.MicroSeconds(2),
      };
      const eventFour = {
        ...defaultTraceEvent,
        ts: TraceEngine.Types.Timing.MicroSeconds(20),
        dur: TraceEngine.Types.Timing.MicroSeconds(10),
      };

      let level = Timeline.AppenderUtils.getEventLevel(eventOne, lastUsedTimeByLevel);
      // For first event, the track is empty, so it always returns 0.
      assert.strictEqual(level, 0);

      level = Timeline.AppenderUtils.getEventLevel(eventTwo, lastUsedTimeByLevel);
      // For eventTwo, its time is a subset of the eventOne, so it will be append as eventOne's child.
      assert.strictEqual(level, 1);

      level = Timeline.AppenderUtils.getEventLevel(eventThree, lastUsedTimeByLevel);
      // For eventTwo, its time is a subset of the eventTwo, so it will be append as eventTwo's child.
      assert.strictEqual(level, 2);

      level = Timeline.AppenderUtils.getEventLevel(eventFour, lastUsedTimeByLevel);
      // For eventFour, its time is a subset of eventOne but not eventTwo, so it will be append as eventTwo's child.
      assert.strictEqual(level, 1);
    });
  });
});
