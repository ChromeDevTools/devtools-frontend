// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as CoverageModule from '../../../../front_end/coverage/coverage.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';

describeWithEnvironment('mergeSegments', () => {
  let Coverage: typeof CoverageModule;
  before(async () => {
    Coverage = await import('../../../../front_end/coverage/coverage.js');
  });

  const checkMerge =
      (a: CoverageModule.CoverageModel.CoverageSegment[], b: CoverageModule.CoverageModel.CoverageSegment[],
       expectedResult: CoverageModule.CoverageModel.CoverageSegment[]) => {
        const mergedAB = Coverage.CoverageModel.mergeSegments(a, b);
        assert.deepEqual(mergedAB, expectedResult);
        const mergedBA = Coverage.CoverageModel.mergeSegments(b, a);
        assert.deepEqual(mergedBA, expectedResult);
      };

  it('merges coverage segments with the same timestamp correctly', () => {
    checkMerge([], [], []);
    checkMerge([{end: 10, count: 1, stamp: 100}], [], [{end: 10, count: 1, stamp: 100}]);
    checkMerge([{end: 10, count: 1, stamp: 100}], [{end: 10, count: 1, stamp: 100}], [{end: 10, count: 2, stamp: 100}]);
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
    checkMerge([{end: 10, count: 1, stamp: 100}], [{end: 10, count: 1, stamp: 200}], [{end: 10, count: 2, stamp: 100}]);
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
