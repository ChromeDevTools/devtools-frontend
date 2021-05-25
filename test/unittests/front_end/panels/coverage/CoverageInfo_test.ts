// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as TextUtils from '../../../../../front_end/models/text_utils/text_utils.js';
import * as Coverage from '../../../../../front_end/panels/coverage/coverage.js';

describe('CoverageInfo', () => {
  describe('#rangesForExport', () => {
    it('omits ranges with count of zero', () => {
      const segments =
          [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}, {end: 30, count: 0, stamp: 100}];
      const info = new Coverage.CoverageModel.CoverageInfo(
          null as unknown as TextUtils.ContentProvider.ContentProvider, 100, 10, 20,
          Coverage.CoverageModel.CoverageType.JavaScript);
      info.mergeCoverage(segments);
      const ranges = info.rangesForExport();
      assert.deepEqual(ranges, [{start: 10, end: 20}]);
    });

    it('merges consecutive ranges with different non-zero counts', () => {
      const segments =
          [{end: 10, count: 0, stamp: 100}, {end: 20, count: 2, stamp: 100}, {end: 30, count: 1, stamp: 100}];
      const info = new Coverage.CoverageModel.CoverageInfo(
          null as unknown as TextUtils.ContentProvider.ContentProvider, 100, 10, 20,
          Coverage.CoverageModel.CoverageType.JavaScript);
      info.mergeCoverage(segments);
      const ranges = info.rangesForExport();
      assert.deepEqual(ranges, [{start: 10, end: 30}]);
    });

    it('does not merge a range with a consecutive range with count zero', () => {
      const segments = [{end: 10, count: 1, stamp: 100}, {end: 30, count: 0, stamp: 100}];
      const info = new Coverage.CoverageModel.CoverageInfo(
          null as unknown as TextUtils.ContentProvider.ContentProvider, 100, 10, 20,
          Coverage.CoverageModel.CoverageType.JavaScript);
      info.mergeCoverage(segments);
      const ranges = info.rangesForExport();
      assert.deepEqual(ranges, [{start: 0, end: 10}]);
    });
  });
});
