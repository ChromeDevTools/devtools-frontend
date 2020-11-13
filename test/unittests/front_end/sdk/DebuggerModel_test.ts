// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as SDKModule from '../../../../front_end/sdk/sdk.js';
import {describeWithEnvironment} from '../helpers/EnvironmentHelpers.js';

describeWithEnvironment('LocationRanges', () => {
  let SDK: typeof SDKModule;
  before(async () => {
    SDK = await import('../../../../front_end/sdk/sdk.js');
  });

  function createRange(scriptId: string, startLine: number, startColumn: number, endLine: number, endColumn: number) {
    return new SDK.DebuggerModel.LocationRange(
        scriptId, new SDK.DebuggerModel.ScriptPosition(startLine, startColumn),
        new SDK.DebuggerModel.ScriptPosition(endLine, endColumn));
  }

  function sort(locationRange: SDKModule.DebuggerModel.LocationRange[]) {
    return locationRange.concat().sort(SDK.DebuggerModel.LocationRange.comparator);
  }

  function sortAndMerge(locationRange: SDKModule.DebuggerModel.LocationRange[]) {
    return SDK.DebuggerModel.sortAndMergeRanges(locationRange.concat());
  }

  function checkIsMaximallyMerged(locationRange: SDKModule.DebuggerModel.LocationRange[]) {
    for (let i = 1; i < locationRange.length; ++i) {
      assert.isTrue(locationRange[i - 1].compareTo(locationRange[i]) < 0);
    }
  }

  const SCRIPT_ID_ONE = 'one';
  const SCRIPT_ID_TWO = 'two';

  it('can be sorted after scriptId', () => {
    const locationRanges = [
      createRange(SCRIPT_ID_TWO, 0, 0, 0, 0),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    const sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());
  });

  it('can be sorted after line number', () => {
    let locationRanges = [
      createRange(SCRIPT_ID_ONE, 3, 0, 0, 0),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    let sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());

    locationRanges = [
      createRange(SCRIPT_ID_ONE, 0, 0, 3, 0),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());
  });

  it('can be sorted after column number', () => {
    let locationRanges = [
      createRange(SCRIPT_ID_ONE, 0, 3, 0, 0),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    let sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());

    locationRanges = [
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 3),
      createRange(SCRIPT_ID_ONE, 0, 0, 0, 0),
    ];
    sorted = sort(locationRanges);
    assert.deepEqual(sorted, locationRanges.reverse());
  });

  it('can be sorted by scriptId, line and column', () => {
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 3, 0, 0),
      createRange(SCRIPT_ID_ONE, 0, 3, 0, 5),
      createRange(SCRIPT_ID_TWO, 3, 3, 3, 5),
      createRange(SCRIPT_ID_TWO, 5, 4, 5, 8),
    ];

    const locationRangeToSort = [
      locationRangesExpected[3],
      locationRangesExpected[1],
      locationRangesExpected[2],
      locationRangesExpected[0],
    ];

    const sorted = sort(locationRangeToSort);
    assert.deepEqual(sorted, locationRangesExpected);
  });

  it('correctly checks overlap', () => {
    const location1 = createRange(SCRIPT_ID_ONE, 1, 0, 3, 0);
    const location2 = createRange(SCRIPT_ID_ONE, 0, 0, 5, 0);

    assert.isTrue(location1.overlap(location2));
    assert.isTrue(location2.overlap(location1));
    assert.isTrue(location1.overlap(location1));
  });

  it('correctly checks overlap (end and start overlapping)', () => {
    const location1 = createRange(SCRIPT_ID_ONE, 1, 0, 3, 0);
    const location2 = createRange(SCRIPT_ID_ONE, 3, 0, 5, 0);

    assert.isTrue(location1.overlap(location2));
    assert.isTrue(location2.overlap(location1));
    assert.isTrue(location1.overlap(location1));
  });

  it('correctly checks non-overlap', () => {
    const location1 = createRange(SCRIPT_ID_TWO, 1, 0, 3, 0);
    const location2 = createRange(SCRIPT_ID_ONE, 3, 1, 5, 0);

    assert.isFalse(location1.overlap(location2));
    assert.isFalse(location2.overlap(location1));
  });

  it('can be reduced if equal', () => {
    const testRange = createRange(SCRIPT_ID_ONE, 0, 3, 3, 3);
    const locationRangesToBeReduced = [
      testRange,
      testRange,
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, [testRange]);
    checkIsMaximallyMerged(reduced);
  });

  it('can be reduced if overlapping (multiple ranges)', () => {
    const locationRangesToBeReduced = [
      createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
      createRange(SCRIPT_ID_ONE, 0, 3, 3, 3),
      createRange(SCRIPT_ID_ONE, 5, 3, 10, 10),
      createRange(SCRIPT_ID_TWO, 5, 4, 10, 10),
    ];
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 3, 10, 10),
      locationRangesToBeReduced[3],
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, locationRangesExpected);
    checkIsMaximallyMerged(reduced);
  });

  it('can be reduced if overlapping (same start, different end)', () => {
    const locationRangesToBeReduced = [
      createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
      createRange(SCRIPT_ID_ONE, 0, 5, 3, 3),
    ];
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, locationRangesExpected);
    checkIsMaximallyMerged(reduced);
  });

  it('can be reduced if overlapping (different start, same end)', () => {
    const locationRangesToBeReduced = [
      createRange(SCRIPT_ID_ONE, 0, 3, 5, 3),
      createRange(SCRIPT_ID_ONE, 0, 5, 5, 3),
    ];
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 3, 5, 3),
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, locationRangesExpected);
    checkIsMaximallyMerged(reduced);
  });

  it('can be reduced if overlapping (start == other.end)', () => {
    const locationRangesToBeReduced = [
      createRange(SCRIPT_ID_ONE, 0, 3, 5, 3),
      createRange(SCRIPT_ID_ONE, 5, 3, 10, 3),
    ];
    const locationRangesExpected = [
      createRange(SCRIPT_ID_ONE, 0, 3, 10, 3),
    ];
    const reduced = sortAndMerge(locationRangesToBeReduced);
    assert.deepEqual(reduced, locationRangesExpected);
    checkIsMaximallyMerged(reduced);
  });
});
