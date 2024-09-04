// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TextUtils from '../../models/text_utils/text_utils.js';

import * as Coverage from './coverage.js';

describe('CoverageModel', () => {
  describe('CoverageInfo', () => {
    describe('#rangesForExport', () => {
      it('omits ranges with count of zero', () => {
        const segments =
            [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}, {end: 30, count: 0, stamp: 100}];
        const info = new Coverage.CoverageModel.CoverageInfo(
            null as unknown as TextUtils.ContentProvider.ContentProvider, 100, 10, 20,
            Coverage.CoverageModel.CoverageType.JAVA_SCRIPT, {} as unknown as Coverage.CoverageModel.URLCoverageInfo);
        info.mergeCoverage(segments);
        const ranges = info.rangesForExport();
        assert.deepEqual(ranges, [{start: 10, end: 20}]);
      });

      it('merges consecutive ranges with different non-zero counts', () => {
        const segments =
            [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}, {end: 30, count: 1, stamp: 100}];
        const info = new Coverage.CoverageModel.CoverageInfo(
            null as unknown as TextUtils.ContentProvider.ContentProvider, 100, 10, 20,
            Coverage.CoverageModel.CoverageType.JAVA_SCRIPT, {} as unknown as Coverage.CoverageModel.URLCoverageInfo);
        info.mergeCoverage(segments);
        const ranges = info.rangesForExport();
        assert.deepEqual(ranges, [{start: 10, end: 30}]);
      });

      it('does not merge a range with a consecutive range with count zero', () => {
        const segments = [{end: 10, count: 1, stamp: 100}, {end: 30, count: 0, stamp: 100}];
        const info = new Coverage.CoverageModel.CoverageInfo(
            null as unknown as TextUtils.ContentProvider.ContentProvider, 100, 10, 20,
            Coverage.CoverageModel.CoverageType.JAVA_SCRIPT, {} as unknown as Coverage.CoverageModel.URLCoverageInfo);
        info.mergeCoverage(segments);
        const ranges = info.rangesForExport();
        assert.deepEqual(ranges, [{start: 0, end: 10}]);
      });
    });
  });

  describe('CoverageModel', () => {
    describe('mergeSegments', () => {
      const checkMerge =
          (a: Coverage.CoverageModel.CoverageSegment[], b: Coverage.CoverageModel.CoverageSegment[],
           expectedResult: Coverage.CoverageModel.CoverageSegment[]) => {
            const mergedAB = Coverage.CoverageModel.mergeSegments(a, b);
            assert.deepEqual(mergedAB, expectedResult);
            const mergedBA = Coverage.CoverageModel.mergeSegments(b, a);
            assert.deepEqual(mergedBA, expectedResult);
          };

      it('merges coverage segments with the same timestamp correctly', () => {
        checkMerge([], [], []);
        checkMerge([{end: 10, count: 1, stamp: 100}], [], [{end: 10, count: 1, stamp: 100}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}], [{end: 10, count: 1, stamp: 100}], [{end: 10, count: 2, stamp: 100}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}], [{end: 20, count: 1, stamp: 100}],
            [{end: 10, count: 2, stamp: 100}, {end: 20, count: 1, stamp: 100}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 1, stamp: 100}], [],
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 1, stamp: 100}]);
        checkMerge(
            [{end: 30, count: 1, stamp: 100}], [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}],
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 3, stamp: 100}, {end: 30, count: 1, stamp: 100}]);
        checkMerge(
            [{end: 30, count: 0, stamp: 100}], [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}],
            [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}, {end: 30, count: 0, stamp: 100}]);
      });

      it('merges coverage segments with the different timestamp correctly', () => {
        checkMerge(
            [{end: 10, count: 1, stamp: 100}], [{end: 10, count: 1, stamp: 200}], [{end: 10, count: 2, stamp: 100}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}], [{end: 20, count: 1, stamp: 200}],
            [{end: 10, count: 2, stamp: 100}, {end: 20, count: 1, stamp: 200}]);
        checkMerge(
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 1, stamp: 200}], [],
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 1, stamp: 200}]);
        checkMerge(
            [{end: 30, count: 1, stamp: 100}], [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 200}],
            [{end: 10, count: 1, stamp: 100}, {end: 20, count: 3, stamp: 100}, {end: 30, count: 1, stamp: 100}]);
      });
    });
  });
});
