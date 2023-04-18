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
    // This color is same as --color-text-primary in themeColors.css
    color: 'rgb(32 33 36)',
    // This color is same as --color-background in themeColors.css
    backgroundColor: 'rgb(255 255 255)',
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
    } as PerfUI.FlameChart.Group;

    it('builds a track header correctly', () => {
      const builtHeader = Timeline.AppenderUtils.buildTrackHeader(
          /* startLevel= */ 0, 'Header Name', Timeline.AppenderUtils.buildGroupStyle(), /* selectable= */ true,
          /* expanded= */ true);
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
      // The i18n encondes spaces using the u00A0 unicode character.
      assert.strictEqual(formattedTime, '10.00\u00A0ms');
    });

    it('returns the time info for given total time and self time correctly', async () => {
      const totalTime = TraceEngine.Types.Timing.MicroSeconds(10000);
      const selfTime = TraceEngine.Types.Timing.MicroSeconds(1000);
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(totalTime, selfTime);
      // The i18n encondes spaces using the u00A0 unicode character.
      assert.strictEqual(formattedTime, '10.00\u00A0ms (self 1.00\u00A0ms)');
    });

    it('returns the time info for same total time and self time correctly', async () => {
      const totalTime = TraceEngine.Types.Timing.MicroSeconds(10000);
      const selfTime = TraceEngine.Types.Timing.MicroSeconds(10000);
      const formattedTime = Timeline.AppenderUtils.getFormattedTime(totalTime, selfTime);
      // The i18n encondes spaces using the u00A0 unicode character.
      assert.strictEqual(formattedTime, '10.00\u00A0ms');
    });
  });
});
