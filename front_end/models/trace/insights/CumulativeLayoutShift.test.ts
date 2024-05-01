// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {TraceLoader} from '../../../testing/TraceLoader.js';
import * as TraceModel from '../trace.js';

import {InsightRunners} from './insights.js';

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
});
