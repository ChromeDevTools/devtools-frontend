// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Lifted from Lighthouse: https://github.com/GoogleChrome/lighthouse/blob/36cac182a6c637b1671c57326d7c0241633d0076/shared/test/statistics-test.js

/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {assert} from 'chai';

import * as Insights from './insights.js';

const {getLogNormalScore} = Insights.Statistics;

describe('statistics', () => {
  describe('#getLogNormalScore', () => {
    it('creates a log normal distribution', () => {
      // This curve plotted with the below parameters.
      // https://www.desmos.com/calculator/ywkivb78cd
      const params = {
        median: 7300,
        p10: 3785,
      };

      // Be stricter with the control point requirements.
      assert.strictEqual(getLogNormalScore(params, 7300), 0.5);
      assert.strictEqual(getLogNormalScore(params, 3785), 0.9);

      assert.strictEqual(getLogNormalScore(params, 0), 1);
      assert.closeTo(getLogNormalScore(params, 1000), 1.00, 0.01);
      assert.closeTo(getLogNormalScore(params, 2500), 0.98, 0.01);
      assert.closeTo(getLogNormalScore(params, 5000), 0.77, 0.01);
      assert.strictEqual(getLogNormalScore(params, 7300), 0.5);
      assert.closeTo(getLogNormalScore(params, 7500), 0.48, 0.01);
      assert.closeTo(getLogNormalScore(params, 10000), 0.27, 0.01);
      assert.closeTo(getLogNormalScore(params, 30000), 0.00, 0.01);
      assert.strictEqual(getLogNormalScore(params, 1000000), 0);
    });

    it('returns 1 for all non-positive values', () => {
      const params = {
        median: 1000,
        p10: 500,
      };
      assert.strictEqual(getLogNormalScore(params, -100000), 1);
      assert.strictEqual(getLogNormalScore(params, -1), 1);
      assert.strictEqual(getLogNormalScore(params, 0), 1);
    });

    it('throws on a non-positive median parameter', () => {
      assert.throws(() => {
        getLogNormalScore({median: 0, p10: 500}, 50);
      }, 'median must be greater than zero');
      assert.throws(() => {
        getLogNormalScore({median: -100, p10: 500}, 50);
      }, 'median must be greater than zero');
    });

    it('throws on a non-positive p10 parameter', () => {
      assert.throws(() => {
        getLogNormalScore({median: 500, p10: 0}, 50);
      }, 'p10 must be greater than zero');
      assert.throws(() => {
        getLogNormalScore({median: 500, p10: -100}, 50);
      }, 'p10 must be greater than zero');
    });

    it('throws if p10 is not less than the median', () => {
      assert.throws(() => {
        getLogNormalScore({median: 500, p10: 500}, 50);
      }, 'p10 must be less than the median');
      assert.throws(() => {
        getLogNormalScore({median: 500, p10: 1000}, 50);
      }, 'p10 must be less than the median');
    });

    describe('score is in correct pass/average/fail range', () => {
      /**
       * Returns the next larger representable double value.
       */
      function plusOneUlp(value: number) {
        const f64 = new Float64Array([value]);
        const big64 = new BigInt64Array(f64.buffer);
        big64[0] += 1n;
        return f64[0];
      }

      /**
       * Returns the next smaller representable double value.
       */
      function minusOneUlp(value: number) {
        if (value === 0) {
          throw new Error('yeah, can\'t do that');
        }
        const f64 = new Float64Array([value]);
        const big64 = new BigInt64Array(f64.buffer);
        big64[0] -= 1n;
        return f64[0];
      }

      const controlPoints = [
        {p10: 200, median: 600},
        {p10: 3387, median: 5800},
        {p10: 0.1, median: 0.25},
        {p10: 28 * 1024, median: 128 * 1024},
        {p10: Number.MIN_VALUE, median: plusOneUlp(Number.MIN_VALUE)},
        {p10: Number.MIN_VALUE, median: 21.239999999999977},
        {p10: 99.56000000000073, median: 99.56000000000074},
        {p10: minusOneUlp(Number.MAX_VALUE), median: Number.MAX_VALUE},
        {p10: Number.MIN_VALUE, median: Number.MAX_VALUE},
      ];

      for (const {p10, median} of controlPoints) {
        it(`is on the right side of the thresholds for {p10: ${p10}, median: ${median}}`, () => {
          const params = {p10, median};

          // Max 1 at 0, everything else must be ≤ 1.
          assert.strictEqual(getLogNormalScore(params, 0), 1);
          assert.isAtMost(getLogNormalScore(params, plusOneUlp(0)), 1);

          // Just better than passing threshold.
          assert.isAtLeast(getLogNormalScore(params, minusOneUlp(p10)), 0.9);
          // At passing threshold.
          assert.strictEqual(getLogNormalScore(params, p10), 0.9);
          // Just worse than passing threshold.
          assert.isBelow(getLogNormalScore(params, plusOneUlp(p10)), 0.9);

          // Just better than average threshold.
          assert.isAtLeast(getLogNormalScore(params, minusOneUlp(median)), 0.5);
          // At average threshold.
          assert.strictEqual(getLogNormalScore(params, median), 0.5);
          // Just worse than passing threshold.
          assert.isBelow(getLogNormalScore(params, plusOneUlp(median)), 0.5);

          // Some curves never quite reach 0, so just assert some extreme values aren't negative.
          assert.isAtLeast(getLogNormalScore(params, 1_000_000_000), 0);
          assert.isAtLeast(getLogNormalScore(params, Number.MAX_SAFE_INTEGER), 0);
          assert.isAtLeast(getLogNormalScore(params, Number.MAX_VALUE), 0);
        });
      }
    });
  });
});
