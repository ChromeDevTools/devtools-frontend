// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError} from '../../../testing/InsightHelpers.js';
import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {InsightRunners} from './insights.js';

export async function processTrace(testContext: Mocha.Suite|Mocha.Context|null, traceFile: string) {
  const {parsedTrace, insights} = await TraceLoader.traceEngine(testContext, traceFile);
  if (!insights) {
    throw new Error('No insights');
  }

  return {data: parsedTrace, insights};
}

// Root cause invalidation window.
const INVALIDATION_WINDOW = Helpers.Timing.secondsToMicroseconds(Types.Timing.Seconds(0.5));

describeWithEnvironment('CumulativeLayoutShift', function() {
  describe('non composited animations', function() {
    it('gets the correct non composited animations', async function() {
      const {data, insights} = await processTrace(this, 'non-composited-animation.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CumulativeLayoutShift', insights, firstNav);
      const {animationFailures} = insight;

      const simpleAnimation = data.Animations.animations.find(animation => {
        return animation.args.data.beginEvent.args.data.displayName === 'simple-animation';
      });
      const top = data.Animations.animations.find(animation => {
        return animation.args.data.beginEvent.args.data.displayName === 'top';
      });

      const expected: InsightRunners.CumulativeLayoutShift.NoncompositedAnimationFailure[] = [
        {
          name: 'simple-animation',
          failureReasons: [InsightRunners.CumulativeLayoutShift.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY],
          unsupportedProperties: ['color'],
          animation: simpleAnimation,
        },
        {
          name: 'top',
          failureReasons: [
            InsightRunners.CumulativeLayoutShift.AnimationFailureReasons.TARGET_HAS_INVALID_COMPOSITING_STATE,
            InsightRunners.CumulativeLayoutShift.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY,
          ],
          unsupportedProperties: ['top'],
          animation: top,
        },
      ];
      assert.deepStrictEqual(animationFailures, expected);
    });
    // Flaky test.
    it.skip('[crbug.com/370382177]: gets the correct non composited animations for shift', async function() {
      const {data, insights} = await processTrace(this, 'non-composited-animation-shift.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CumulativeLayoutShift', insights, firstNav);
      const {shifts, animationFailures} = insight;

      const simpleAnimation = data.Animations.animations.find(animation => {
        return animation.args.data.beginEvent.args.data.displayName === 'simple-animation';
      });
      const top = data.Animations.animations.find(animation => {
        return animation.args.data.beginEvent.args.data.displayName === 'top';
      });

      const shiftAnimations: InsightRunners.CumulativeLayoutShift.NoncompositedAnimationFailure[] = [];
      shifts.forEach(entry => {
        shiftAnimations.push(...entry.nonCompositedAnimations);
      });
      const expectedWithShift: InsightRunners.CumulativeLayoutShift.NoncompositedAnimationFailure[] = [
        {
          name: 'simple-animation',
          failureReasons: [InsightRunners.CumulativeLayoutShift.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY],
          unsupportedProperties: ['height', 'color', 'top'],
          animation: simpleAnimation,
        },
      ];
      assert.deepStrictEqual(shiftAnimations, expectedWithShift);

      const expectedAll: InsightRunners.CumulativeLayoutShift.NoncompositedAnimationFailure[] = [
        {
          name: 'simple-animation',
          failureReasons: [InsightRunners.CumulativeLayoutShift.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY],
          unsupportedProperties: ['height', 'color', 'top'],
          animation: simpleAnimation,
        },
        {
          name: 'top',
          failureReasons: [InsightRunners.CumulativeLayoutShift.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY],
          unsupportedProperties: ['top'],
          animation: top,
        },
      ];
      // animationFailures should include both root causes failures, and failures without associated shifts.
      assert.deepStrictEqual(animationFailures, expectedAll);
    });

    it('returns no insights when there are no non-composited animations', async function() {
      const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CumulativeLayoutShift', insights, firstNav);
      const {animationFailures} = insight;

      assert.isEmpty(animationFailures);
    });
  });
  describe('layout shifts', function() {
    it('returns correct layout shifts', async function() {
      const {data, insights} = await processTrace(this, 'cls-single-frame.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CumulativeLayoutShift', insights, firstNav);
      const {shifts} = insight;

      assert.exists(shifts);
      assert.strictEqual(shifts.size, 7);
    });

    describe('root causes', function() {
      it('handles potential iframe root cause correctly', async function() {
        // Trace has a single iframe that gets created before the first layout shift and causes a layout shift.
        const {data, insights} = await processTrace(this, 'iframe-shift.json.gz');
        const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
        const insight = getInsightOrError('CumulativeLayoutShift', insights, firstNav);
        const {shifts} = insight;

        assert.exists(shifts);
        assert.strictEqual(shifts.size, 3);

        const shift1 = Array.from(shifts)[0][0];
        const shiftIframes = shifts.get(shift1)?.iframeIds;
        assert.exists(shiftIframes);
        assert.strictEqual(shiftIframes.length, 1);

        const iframe = shiftIframes[0];

        // Find the event with the matching frame id to make sure we got the right id.
        const dlEvent = data.LayoutShifts.domLoadingEvents.find(e => {
          return e.args.frame === iframe;
        });
        assert.exists(dlEvent);

        // Ensure the iframe happens within the invalidation window.
        assert.isTrue(dlEvent.ts < shift1.ts && dlEvent.ts >= shift1.ts - INVALIDATION_WINDOW);
        // Other shifts should not have iframe root causes.
        const shift2 = Array.from(shifts)[1][0];
        assert.isEmpty(shifts.get(shift2)?.iframeIds);
        const shift3 = Array.from(shifts)[2][0];
        assert.isEmpty(shifts.get(shift3)?.iframeIds);
      });

      it('handles potential font root cause correctly', async function() {
        // Trace has font load before the second layout shift.
        const {data, insights} = await processTrace(this, 'iframe-shift.json.gz');
        const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
        const insight = getInsightOrError('CumulativeLayoutShift', insights, firstNav);
        const {shifts} = insight;

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
  describe('clusters', function() {
    it('returns clusters correctly', async function() {
      const {data, insights} = await processTrace(this, 'iframe-shift.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CumulativeLayoutShift', insights, firstNav);
      const {shifts, clusters} = insight;

      assert.exists(clusters);
      assert.exists(shifts);
      assert.strictEqual(clusters.length, 2);
      for (const cluster of clusters) {
        // Check that the cluster events exist in shifts map.
        for (const shiftEvent of cluster.events) {
          assert.exists(shifts.get(shiftEvent));
        }
      }
    });

    it('returns clusters correctly for non-navigations', async function() {
      const {insights} = await processTrace(this, 'cls-no-nav.json.gz');
      const insight = getInsightOrError('CumulativeLayoutShift', insights);
      const {shifts, clusters} = insight;

      assert.exists(clusters);
      assert.exists(shifts);
      assert.strictEqual(clusters.length, 3);
      for (const cluster of clusters) {
        // Check that the cluster events exist in shifts map.
        for (const shiftEvent of cluster.events) {
          assert.exists(shifts.get(shiftEvent));
        }
      }
    });
  });
});
