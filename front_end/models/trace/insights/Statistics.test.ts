// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Lifted from Lighthouse: https://github.com/GoogleChrome/lighthouse/blob/36cac182a6c637b1671c57326d7c0241633d0076/shared/test/statistics-test.js

/**
 * @license
 * Copyright 2016 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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
      expect(getLogNormalScore(params, 7300)).to.equal(0.5);
      expect(getLogNormalScore(params, 3785)).to.equal(0.9);

      expect(getLogNormalScore(params, 0)).to.equal(1);
      expect(getLogNormalScore(params, 1000)).to.be.closeTo(1.00, 0.01);
      expect(getLogNormalScore(params, 2500)).to.be.closeTo(0.98, 0.01);
      expect(getLogNormalScore(params, 5000)).to.be.closeTo(0.77, 0.01);
      expect(getLogNormalScore(params, 7300)).to.equal(0.5);
      expect(getLogNormalScore(params, 7500)).to.be.closeTo(0.48, 0.01);
      expect(getLogNormalScore(params, 10000)).to.be.closeTo(0.27, 0.01);
      expect(getLogNormalScore(params, 30000)).to.be.closeTo(0.00, 0.01);
      expect(getLogNormalScore(params, 1000000)).to.equal(0);
    });

    it('returns 1 for all non-positive values', () => {
      const params = {
        median: 1000,
        p10: 500,
      };
      expect(getLogNormalScore(params, -100000)).to.equal(1);
      expect(getLogNormalScore(params, -1)).to.equal(1);
      expect(getLogNormalScore(params, 0)).to.equal(1);
    });

    it('throws on a non-positive median parameter', () => {
      expect(() => {
        getLogNormalScore({median: 0, p10: 500}, 50);
      }).to.throw('median must be greater than zero');
      expect(() => {
        getLogNormalScore({median: -100, p10: 500}, 50);
      }).to.throw('median must be greater than zero');
    });

    it('throws on a non-positive p10 parameter', () => {
      expect(() => {
        getLogNormalScore({median: 500, p10: 0}, 50);
      }).to.throw('p10 must be greater than zero');
      expect(() => {
        getLogNormalScore({median: 500, p10: -100}, 50);
      }).to.throw('p10 must be greater than zero');
    });

    it('throws if p10 is not less than the median', () => {
      expect(() => {
        getLogNormalScore({median: 500, p10: 500}, 50);
      }).to.throw('p10 must be less than the median');
      expect(() => {
        getLogNormalScore({median: 500, p10: 1000}, 50);
      }).to.throw('p10 must be less than the median');
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
          expect(getLogNormalScore(params, 0)).to.equal(1);
          expect(getLogNormalScore(params, plusOneUlp(0))).to.be.lessThanOrEqual(1);

          // Just better than passing threshold.
          expect(getLogNormalScore(params, minusOneUlp(p10))).to.be.greaterThanOrEqual(0.9);
          // At passing threshold.
          expect(getLogNormalScore(params, p10)).to.equal(0.9);
          // Just worse than passing threshold.
          expect(getLogNormalScore(params, plusOneUlp(p10))).to.be.lessThan(0.9);

          // Just better than average threshold.
          expect(getLogNormalScore(params, minusOneUlp(median))).to.be.greaterThanOrEqual(0.5);
          // At average threshold.
          expect(getLogNormalScore(params, median)).to.equal(0.5);
          // Just worse than passing threshold.
          expect(getLogNormalScore(params, plusOneUlp(median))).to.be.lessThan(0.5);

          // Some curves never quite reach 0, so just assert some extreme values aren't negative.
          expect(getLogNormalScore(params, 1_000_000_000)).to.be.greaterThanOrEqual(0);
          expect(getLogNormalScore(params, Number.MAX_SAFE_INTEGER)).to.be.greaterThanOrEqual(0);
          expect(getLogNormalScore(params, Number.MAX_VALUE)).to.be.greaterThanOrEqual(0);
        });
      }
    });
  });
});
