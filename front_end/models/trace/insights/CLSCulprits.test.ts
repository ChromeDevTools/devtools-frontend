// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../testing/EnvironmentHelpers.js';
import {getFirstOrError, getInsightOrError, processTrace} from '../../../testing/InsightHelpers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {Models} from './insights.js';

// Root cause invalidation window.
const INVALIDATION_WINDOW = Helpers.Timing.secondsToMicro(Types.Timing.Seconds(0.5));

describeWithEnvironment('CLSCulprits', function() {
  describe('non composited animations', function() {
    it('gets the correct non composited animations', async function() {
      const {data, insights} = await processTrace(this, 'non-composited-animation.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CLSCulprits', insights, firstNav);
      const {animationFailures} = insight;

      const simpleAnimation = data.Animations.animations.find(animation => {
        return animation.args.data.beginEvent.args.data.displayName === 'simple-animation';
      });
      const top = data.Animations.animations.find(animation => {
        return animation.args.data.beginEvent.args.data.displayName === 'top';
      });

      const expected: Models.CLSCulprits.NoncompositedAnimationFailure[] = [
        {
          name: 'simple-animation',
          failureReasons: [Models.CLSCulprits.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY],
          unsupportedProperties: ['color'],
          animation: simpleAnimation,
        },
        {
          name: 'top',
          failureReasons: [
            Models.CLSCulprits.AnimationFailureReasons.TARGET_HAS_INVALID_COMPOSITING_STATE,
            Models.CLSCulprits.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY,
          ],
          unsupportedProperties: ['top'],
          animation: top,
        },
      ];
      assert.deepEqual(animationFailures, expected);
    });

    it('gets the correct non composited animations for shift', async function() {
      const {data, insights} = await processTrace(this, 'non-composited-animation-shift.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CLSCulprits', insights, firstNav);
      const {shifts, animationFailures} = insight;

      const simpleAnimation = data.Animations.animations.find(animation => {
        return animation.args.data.beginEvent.args.data.displayName === 'simple-animation';
      });
      const top = data.Animations.animations.find(animation => {
        return animation.args.data.beginEvent.args.data.displayName === 'top';
      });

      const shiftAnimations: Models.CLSCulprits.NoncompositedAnimationFailure[] = [];
      shifts.forEach(entry => {
        shiftAnimations.push(...entry.nonCompositedAnimations);
      });
      const expectedWithShift: Models.CLSCulprits.NoncompositedAnimationFailure[] = [
        {
          name: 'simple-animation',
          failureReasons: [
            Models.CLSCulprits.AnimationFailureReasons.TARGET_HAS_INVALID_COMPOSITING_STATE,
            Models.CLSCulprits.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY,
          ],
          unsupportedProperties: ['height', 'color', 'top'],
          animation: simpleAnimation,
        },
      ];
      assert.deepEqual(shiftAnimations, expectedWithShift);

      const expectedAll: Models.CLSCulprits.NoncompositedAnimationFailure[] = [
        {
          name: 'simple-animation',
          failureReasons: [
            Models.CLSCulprits.AnimationFailureReasons.TARGET_HAS_INVALID_COMPOSITING_STATE,
            Models.CLSCulprits.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY
          ],
          unsupportedProperties: ['height', 'color', 'top'],
          animation: simpleAnimation,
        },
        {
          name: 'top',
          failureReasons: [
            Models.CLSCulprits.AnimationFailureReasons.TARGET_HAS_INVALID_COMPOSITING_STATE,
            Models.CLSCulprits.AnimationFailureReasons.UNSUPPORTED_CSS_PROPERTY
          ],
          unsupportedProperties: ['top'],
          animation: top,
        },
      ];
      // animationFailures should include both root causes failures, and failures without associated shifts.
      assert.deepEqual(animationFailures, expectedAll);
    });

    it('returns no insights when there are no non-composited animations', async function() {
      const {data, insights} = await processTrace(this, 'lcp-images.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CLSCulprits', insights, firstNav);
      const {animationFailures} = insight;

      assert.isEmpty(animationFailures);
    });
  });
  describe('layout shifts', function() {
    it('returns correct layout shifts', async function() {
      const {data, insights} = await processTrace(this, 'cls-single-frame.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CLSCulprits', insights, firstNav);
      const {shifts} = insight;

      assert.exists(shifts);
      assert.strictEqual(shifts.size, 7);
    });

    describe('root causes', function() {
      it('handles potential iframe root cause correctly', async function() {
        // Trace has a single iframe that gets created before the first layout shift and causes a layout shift.
        const {data, insights} = await processTrace(this, 'iframe-shift.json.gz');
        const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
        const insight = getInsightOrError('CLSCulprits', insights, firstNav);
        const {shifts} = insight;

        assert.exists(shifts);
        assert.strictEqual(shifts.size, 3);

        const shift1 = Array.from(shifts)[0][0];
        const shiftIframes = shifts.get(shift1)?.iframes;
        assert.exists(shiftIframes);
        assert.lengthOf(shiftIframes, 1);

        const iframe = shiftIframes[0];

        assert.strictEqual(iframe.frame, '36E9367B04D158F1DC34D4E46B5A124C');
        assert.strictEqual(iframe.url, 'http://localhost:10200/simple-page.html');

        // Find the event with the matching frame id to make sure we got the right id.
        const dlEvent = data.LayoutShifts.domLoadingEvents.find(e => {
          return e.args.frame === iframe.frame;
        });
        assert.exists(dlEvent);

        // Ensure the iframe happens within the invalidation window.
        assert.isTrue(dlEvent.ts < shift1.ts && dlEvent.ts >= shift1.ts - INVALIDATION_WINDOW);
        // Other shifts should not have iframe root causes.
        const shift2 = Array.from(shifts)[1][0];
        assert.isEmpty(shifts.get(shift2)?.iframes);
        const shift3 = Array.from(shifts)[2][0];
        assert.isEmpty(shifts.get(shift3)?.iframes);
      });

      it('handles potential font root cause correctly', async function() {
        // Trace has font load before the second layout shift.
        const {data, insights} = await processTrace(this, 'iframe-shift.json.gz');
        const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
        const insight = getInsightOrError('CLSCulprits', insights, firstNav);
        const {shifts} = insight;

        assert.exists(shifts);
        assert.strictEqual(shifts.size, 3);

        const layoutShiftEvents = Array.from(shifts.entries());

        const shift2 = layoutShiftEvents.at(1);
        assert.isOk(shift2);
        const shiftEvent = shift2[0];

        const shiftFonts = shift2[1].webFonts;
        assert.exists(shiftFonts);
        assert.lengthOf(shiftFonts, 1);

        const fontRequest = shiftFonts[0];
        const fontRequestEndTime = fontRequest.ts + fontRequest.dur;
        // Ensure the font loads within the invalidation window.
        assert.isTrue(fontRequestEndTime < shiftEvent.ts && fontRequestEndTime >= shiftEvent.ts - INVALIDATION_WINDOW);

        // Other shifts should not have font root causes.
        const shift1 = layoutShiftEvents.at(0);
        assert.isOk(shift1);
        assert.isEmpty(shift1[1].webFonts);

        const shift3 = layoutShiftEvents.at(2);
        assert.isOk(shift3);
        assert.isEmpty(shift3[1].webFonts);
      });

      it('handles potential unsized images root cause correctly', async function() {
        const {data, insights} = await processTrace(this, 'unsized-images.json.gz');
        const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
        const insight = getInsightOrError('CLSCulprits', insights, firstNav);
        const {shifts} = insight;
        assert.exists(shifts);
        assert.strictEqual(shifts.size, 2);

        const unsizedImages = data.LayoutShifts.layoutImageUnsizedEvents;
        assert.lengthOf(unsizedImages, 2);

        const layoutShiftEvents = Array.from(shifts.entries());
        const shift1 = layoutShiftEvents.at(0);
        assert.isOk(shift1);
        // Root cause should match the nodeId of the unsized images events.
        assert.strictEqual(shift1[1].unsizedImages[0].backendNodeId, unsizedImages[0].args.data.nodeId);
        assert.isDefined(shift1[1].unsizedImages[0].paintImageEvent);

        const shift2 = layoutShiftEvents.at(1);
        assert.isOk(shift2);
        assert.strictEqual(shift2[1].unsizedImages[0].backendNodeId, unsizedImages[1].args.data.nodeId);
        assert.isDefined(shift2[1].unsizedImages[0].paintImageEvent);
      });
    });
  });
  describe('clusters', function() {
    it('returns clusters correctly', async function() {
      const {data, insights} = await processTrace(this, 'iframe-shift.json.gz');
      const firstNav = getFirstOrError(data.Meta.navigationsByNavigationId.values());
      const insight = getInsightOrError('CLSCulprits', insights, firstNav);
      const {shifts, clusters} = insight;

      assert.exists(clusters);
      assert.exists(shifts);
      assert.lengthOf(clusters, 2);
      for (const cluster of clusters) {
        // Check that the cluster events exist in shifts map.
        for (const shiftEvent of cluster.events) {
          assert.exists(shifts.get(shiftEvent));
        }
      }
    });

    it('returns clusters correctly for non-navigations', async function() {
      const {insights} = await processTrace(this, 'cls-no-nav.json.gz');
      const insight = getInsightOrError('CLSCulprits', insights);
      const {shifts, clusters} = insight;

      assert.exists(clusters);
      assert.exists(shifts);
      assert.lengthOf(clusters, 3);
      for (const cluster of clusters) {
        // Check that the cluster events exist in shifts map.
        for (const shiftEvent of cluster.events) {
          assert.exists(shifts.get(shiftEvent));
        }
      }
    });
  });
});
