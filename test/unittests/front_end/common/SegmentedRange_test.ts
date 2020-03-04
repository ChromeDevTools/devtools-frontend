// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const { assert } = chai;

import * as Common from '/front_end/common/common.js';

describe('Segment', () => {
  it('calculates intersections', () => {
    const segmentA = new Common.SegmentedRange.Segment(1, 2, 'A');
    const segmentB = new Common.SegmentedRange.Segment(1.5, 2.5, 'B');
    const segmentC = new Common.SegmentedRange.Segment(3, 5, 'C');

    assert.isTrue(segmentA.intersects(segmentB));
    assert.isFalse(segmentA.intersects(segmentC));
  });

  it('throws for invalid segments', () => {
    assert.throws(() => new Common.SegmentedRange.Segment(3, 2, 'V'));
  });
});

describe('SegmentedRange', () => {
  let segmentedRange: Common.SegmentedRange.SegmentedRange;

  function mergeSegments(first: Common.SegmentedRange.Segment, second: Common.SegmentedRange.Segment) {
    const inOrder = first.end >= second.begin;
    const matchingData = first.data === second.data;
    return inOrder && matchingData ? first : null;
  }

  beforeEach(() => {
    segmentedRange = new Common.SegmentedRange.SegmentedRange(mergeSegments);
  });

  it('handles single ranges', () => {
    const segment = new Common.SegmentedRange.Segment(0, 1, 'A');
    segmentedRange.append(segment);

    assert.deepEqual(segmentedRange.segments(), [segment]);
  });

  it('handles two adjacent ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(1, 2, 'A');
    const segmentB = new Common.SegmentedRange.Segment(2, 3, 'B');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);

    assert.deepEqual(segmentedRange.segments(), [segmentA, segmentB]);
  });

  it('handles two overlapping mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(1, 2, 'A');
    const segmentB = new Common.SegmentedRange.Segment(1.5, 3, 'A');


    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);

    const expectedSegment = new Common.SegmentedRange.Segment(1, 3, 'A');
    assert.deepEqual(segmentedRange.segments(), [expectedSegment]);
  });

  it('handles multiple overlapping mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(1, 2, 'A');
    const segmentB = new Common.SegmentedRange.Segment(3, 5, 'A');
    const segmentC = new Common.SegmentedRange.Segment(1.5, 3.5, 'A');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);
    segmentedRange.append(segmentC);

    const expectedSegment = new Common.SegmentedRange.Segment(1, 5, 'A');
    assert.deepEqual(segmentedRange.segments(), [expectedSegment]);
  });

  it('handles multiple overlapping non-mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(1, 2, 'A');
    const segmentB = new Common.SegmentedRange.Segment(3, 5, 'A');
    const segmentC = new Common.SegmentedRange.Segment(1.5, 3.5, 'B');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);
    segmentedRange.append(segmentC);

    const expectedSegments = [
      new Common.SegmentedRange.Segment(1, 1.5, 'A'),
      new Common.SegmentedRange.Segment(1.5, 3.5, 'B'),
      new Common.SegmentedRange.Segment(3.5, 5, 'A'),
    ];
    assert.deepEqual(segmentedRange.segments(), expectedSegments);
  });

  it('handles two overlapping non-mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(1, 2, 'A');
    const segmentB = new Common.SegmentedRange.Segment(1.5, 3, 'B');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);

    const expectedSegments = [
      new Common.SegmentedRange.Segment(1, 1.5, 'A'),
      new Common.SegmentedRange.Segment(1.5, 3, 'B'),
    ];
    assert.deepEqual(segmentedRange.segments(), expectedSegments);
  });

  it('handles nested, mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(0, 4, 'A');
    const segmentB = new Common.SegmentedRange.Segment(2, 3, 'A');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);

    const expectedSegment = new Common.SegmentedRange.Segment(0, 4, 'A');
    assert.deepEqual(segmentedRange.segments(), [expectedSegment]);
  });

  it('handles nested, non-mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(0, 4, 'A');
    const segmentB = new Common.SegmentedRange.Segment(2, 3, 'B');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);

    const expectedSegments = [
      new Common.SegmentedRange.Segment(0, 2, 'A'),
      new Common.SegmentedRange.Segment(2, 3, 'B'),
      new Common.SegmentedRange.Segment(3, 4, 'A'),
    ];
    assert.deepEqual(segmentedRange.segments(), expectedSegments);
  });

  it('handles out-of-order, mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(0, 2, 'A');
    const segmentB = new Common.SegmentedRange.Segment(3, 5, 'A');
    const segmentC = new Common.SegmentedRange.Segment(2, 3, 'A');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);
    segmentedRange.append(segmentC);

    const expectedSegment = new Common.SegmentedRange.Segment(0, 5, 'A');
    assert.deepEqual(segmentedRange.segments(), [expectedSegment]);
  });

  it('handles out-of-order, non-mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(0, 2, 'A');
    const segmentB = new Common.SegmentedRange.Segment(3, 5, 'A');
    const segmentC = new Common.SegmentedRange.Segment(2, 3, 'B');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);
    segmentedRange.append(segmentC);

    const expectedSegments = [
      new Common.SegmentedRange.Segment(0, 2, 'A'),
      new Common.SegmentedRange.Segment(2, 3, 'B'),
      new Common.SegmentedRange.Segment(3, 5, 'A'),
    ];
    assert.deepEqual(segmentedRange.segments(), expectedSegments);
  });

  it('handles one segment consuming many mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(0, 1, 'A');
    const segmentB = new Common.SegmentedRange.Segment(2, 3, 'A');
    const segmentC = new Common.SegmentedRange.Segment(4, 5, 'A');
    const segmentD = new Common.SegmentedRange.Segment(6, 7, 'A');

    // E merges A through D.
    const segmentE = new Common.SegmentedRange.Segment(2, 6, 'A');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);
    segmentedRange.append(segmentC);
    segmentedRange.append(segmentD);
    segmentedRange.append(segmentE);

    const expectedSegments = [
      new Common.SegmentedRange.Segment(0, 1, 'A'),
      new Common.SegmentedRange.Segment(2, 7, 'A'),
    ];
    assert.deepEqual(segmentedRange.segments(), expectedSegments);
  });

  it('handles one segment consuming many non-mergeable ranges', () => {
    const segmentA = new Common.SegmentedRange.Segment(0, 1, 'A');
    const segmentB = new Common.SegmentedRange.Segment(2, 3, 'A');
    const segmentC = new Common.SegmentedRange.Segment(4, 5, 'A');
    const segmentD = new Common.SegmentedRange.Segment(6, 7, 'A');

    // E merges A through D.
    const segmentE = new Common.SegmentedRange.Segment(2, 6, 'B');

    segmentedRange.append(segmentA);
    segmentedRange.append(segmentB);
    segmentedRange.append(segmentC);
    segmentedRange.append(segmentD);
    segmentedRange.append(segmentE);

    const expectedSegments = [
      new Common.SegmentedRange.Segment(0, 1, 'A'),
      new Common.SegmentedRange.Segment(2, 6, 'B'),
      new Common.SegmentedRange.Segment(6, 7, 'A'),
    ];
    assert.deepEqual(segmentedRange.segments(), expectedSegments);
  });
});
