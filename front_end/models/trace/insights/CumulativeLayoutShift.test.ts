// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Helpers from '../helpers/helpers.js';
import * as TraceModel from '../trace.js';
import * as Types from '../types/types.js';

import {InsightRunners} from './insights.js';

// Root cause invalidation window.
const INVALIDATION_WINDOW = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(0.5));

describe('CumulativeLayoutShift', function() {
  describe('non composited animations', function() {
    it('gets the correct non composited animations', async function() {
      const data = await TraceLoader.traceEngine(this, 'non-composited-animation.json.gz');
      const context = {
        frameId: data.Meta.mainFrameId,
        navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
      };
      const {animationFailures} =
          TraceModel.Insights.InsightRunners.CumulativeLayoutShift.generateInsight(data, context);
      const expected: InsightRunners.CumulativeLayoutShift.NoncompositedAnimationFailure[] = [
        {
          name: 'simple-animation',
          failureReasons: [InsightRunners.CumulativeLayoutShift.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY],
          unsupportedProperties: ['color'],
        },
        {
          name: 'top',
          failureReasons: [InsightRunners.CumulativeLayoutShift.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY],
          unsupportedProperties: ['top'],
        },
      ];
      assert.deepStrictEqual(animationFailures, expected);
    });
    it('returns no insights when there are no non-composited animations', async function() {
      const data = await TraceLoader.traceEngine(this, 'lcp-images.json.gz');
      const context = {
        frameId: data.Meta.mainFrameId,
        navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
      };
      const {animationFailures} =
          TraceModel.Insights.InsightRunners.CumulativeLayoutShift.generateInsight(data, context);
      assert.isEmpty(animationFailures);
    });
  });
  describe('layout shifts', function() {
    it('returns correct layout shifts', async function() {
      const data = await TraceLoader.traceEngine(this, 'cls-single-frame.json.gz');
      const context = {
        frameId: data.Meta.mainFrameId,
        navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
      };
      const {shifts} = TraceModel.Insights.InsightRunners.CumulativeLayoutShift.generateInsight(data, context);
      assert.exists(shifts);
      assert.strictEqual(shifts.size, 7);
    });

    describe('root causes', function() {
      it('handles potential iframe root cause correctly', async function() {
        // Trace has a single iframe that gets created before the first layout shift and causes a layout shift.
        const data = await TraceLoader.traceEngine(this, 'iframe-shift.json.gz');
        const context = {
          frameId: data.Meta.mainFrameId,
          navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
        };
        const {shifts} = TraceModel.Insights.InsightRunners.CumulativeLayoutShift.generateInsight(data, context);
        assert.exists(shifts);
        assert.strictEqual(shifts.size, 3);

        const shift1 = Array.from(shifts)[0][0];
        const shiftIframes = shifts.get(shift1)?.iframes;
        assert.exists(shiftIframes);
        assert.strictEqual(shiftIframes.length, 1);

        const iframe = shiftIframes[0];
        const iframeEndTime = iframe.dur ? iframe.ts + iframe.dur : iframe.ts;
        // Ensure the iframe happens within the invalidation window.
        assert.isTrue(iframeEndTime < shift1.ts && iframeEndTime >= shift1.ts - INVALIDATION_WINDOW);

        // Other shifts should not have iframe root causes.
        const shift2 = Array.from(shifts)[1][0];
        assert.isEmpty(shifts.get(shift2)?.iframes);
        const shift3 = Array.from(shifts)[2][0];
        assert.isEmpty(shifts.get(shift3)?.iframes);
      });

      it('handles potential font root cause correctly', async function() {
        // Trace has font load before the second layout shift.
        const data = await TraceLoader.traceEngine(this, 'iframe-shift.json.gz');
        const context = {
          frameId: data.Meta.mainFrameId,
          navigationId: data.Meta.navigationsByNavigationId.keys().next().value,
        };
        const {shifts} = TraceModel.Insights.InsightRunners.CumulativeLayoutShift.generateInsight(data, context);
        assert.exists(shifts);
        assert.strictEqual(shifts.size, 3);

        const layoutShiftEvents = Array.from(shifts.entries());

        const shift2 = layoutShiftEvents.at(1);
        assert.isOk(shift2);
        const shiftEvent = shift2[0];

        const shiftFonts = shift2[1].fontRequests;
        assert.exists(shiftFonts);
        assert.strictEqual(shiftFonts.length, 1);

        const fontRequest = shiftFonts[0];
        const fontRequestEndTime = fontRequest.ts + fontRequest.dur;
        // Ensure the font loads within the invalidation window.
        assert.isTrue(fontRequestEndTime < shiftEvent.ts && fontRequestEndTime >= shiftEvent.ts - INVALIDATION_WINDOW);

        // Other shifts should not have font root causes.
        const shift1 = layoutShiftEvents.at(0);
        assert.isOk(shift1);
        assert.isEmpty(shift1[1].fontRequests);

        const shift3 = layoutShiftEvents.at(2);
        assert.isOk(shift3);
        assert.isEmpty(shift3[1].fontRequests);
      });
    });
  });
});
