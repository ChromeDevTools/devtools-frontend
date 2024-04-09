// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {type PathCommands, type Position, type Quad} from './common.js';
import {
  distance,
  getColinearPointAtDistance,
  getGapQuadBetweenQuads,
  getGapQuads,
  getLinesAndItemsQuads,
  growQuadToEdgesOf,
  intersectSegments,
  segmentContains,
  uniteQuads,
} from './highlight_flex_common.js';

function createPathCommands(...points: number[]): PathCommands {
  if (points.length !== 8) {
    throw new Error('Expected 8 coordinates to describe the element');
  }

  const path: PathCommands = ['M'];
  for (let i = 0; i < points.length; i += 2) {
    path.push(points[i]);
    path.push(points[i + 1]);
    path.push('L');
  }
  path[path.length - 1] = 'Z';

  return path;
}

function createItem(...points: number[]): {itemBorder: PathCommands, baseline: number} {
  return {
    itemBorder: createPathCommands(...points),
    baseline: 0,
  };
}

function createQuad(...points: number[]): Quad {
  if (points.length !== 8) {
    throw new Error('Expected 8 coordinates to describe the element');
  }

  return {
    p1: {x: points[0], y: points[1]},
    p2: {x: points[2], y: points[3]},
    p3: {x: points[4], y: points[5]},
    p4: {x: points[6], y: points[7]},
  };
}

describe('getLinesAndItemsQuads', () => {
  it('creates the right number of line and item quads', () => {
    const lineQuads = getLinesAndItemsQuads(
        createPathCommands(0, 0, 100, 0, 100, 100, 0, 100),
        [
          [
            createItem(10, 10, 30, 10, 30, 30, 10, 30),
            createItem(40, 10, 60, 10, 60, 30, 40, 30),
            createItem(70, 10, 90, 10, 90, 30, 70, 30),
          ],
          [
            createItem(10, 40, 70, 40, 70, 70, 10, 70),
            createItem(80, 40, 90, 40, 90, 70, 80, 70),
          ],
          [
            createItem(10, 80, 40, 80, 40, 90, 10, 90),
            createItem(50, 80, 90, 80, 90, 90, 50, 90),
          ],
        ],
        true, false);

    assert.strictEqual(lineQuads.length, 3, '3 line quads got created');
    assert.strictEqual(lineQuads[0].items.length, 3, '3 flex items on the first line got created');
    assert.strictEqual(lineQuads[1].items.length, 2, '2 flex items on the second line got created');
    assert.strictEqual(lineQuads[2].items.length, 2, '2 flex items on the third line got created');
  });

  it('creates a line quad as big as the container when there is only one line', () => {
    const lineQuads = getLinesAndItemsQuads(
        createPathCommands(0, 0, 10, 0, 10, 10, 0, 10), [[createItem(2, 2, 8, 2, 8, 8, 2, 8)]], true, false);

    assert.deepStrictEqual(lineQuads[0].quad.p1, {x: 0, y: 0});
    assert.deepStrictEqual(lineQuads[0].quad.p2, {x: 10, y: 0});
    assert.deepStrictEqual(lineQuads[0].quad.p3, {x: 10, y: 10});
    assert.deepStrictEqual(lineQuads[0].quad.p4, {x: 0, y: 10});
  });

  it('creates quads for flex lines that extend to the edges of the container in the main direction', () => {
    const lineQuadsRowDirection = getLinesAndItemsQuads(
        createPathCommands(0, 0, 100, 0, 100, 80, 0, 80),
        [
          [
            createItem(10, 10, 30, 10, 30, 30, 10, 30),
            createItem(40, 10, 60, 10, 60, 30, 40, 30),
            createItem(70, 10, 90, 10, 90, 30, 70, 30),
          ],
          [
            createItem(10, 40, 70, 40, 70, 70, 10, 70),
            createItem(80, 40, 90, 40, 90, 70, 80, 70),
          ],
        ],
        true, false);

    assert.deepStrictEqual(lineQuadsRowDirection[0].quad, createQuad(0, 10, 100, 10, 100, 30, 0, 30));

    assert.deepStrictEqual(lineQuadsRowDirection[1].quad, createQuad(0, 40, 100, 40, 100, 70, 0, 70));

    const lineQuadsColumnDirection = getLinesAndItemsQuads(
        createPathCommands(0, 0, 50, 0, 50, 70, 0, 70),
        [
          [
            createItem(10, 10, 20, 10, 20, 30, 10, 30),
            createItem(10, 40, 20, 40, 20, 50, 10, 50),
          ],
          [
            createItem(30, 20, 40, 20, 40, 40, 30, 40),
            createItem(30, 50, 40, 50, 40, 60, 30, 60),
          ],
        ],
        false, false);

    assert.deepStrictEqual(lineQuadsColumnDirection[0].quad, createQuad(10, 0, 20, 0, 20, 70, 10, 70));

    assert.deepStrictEqual(lineQuadsColumnDirection[1].quad, createQuad(30, 0, 40, 0, 40, 70, 30, 70));
  });

  it('creates normal and extended quads for items', () => {
    const lineQuads = getLinesAndItemsQuads(
        createPathCommands(0, 0, 70, 0, 70, 40, 0, 40),
        [
          [
            createItem(10, 10, 30, 10, 30, 30, 10, 30),
            createItem(40, 10, 60, 10, 60, 30, 40, 30),
          ],
        ],
        true, false);

    assert.deepStrictEqual(
        lineQuads[0].items[0], createQuad(10, 10, 30, 10, 30, 30, 10, 30), 'The first flex item quad matches the item');

    assert.deepStrictEqual(
        lineQuads[0].items[1], createQuad(40, 10, 60, 10, 60, 30, 40, 30),
        'The second flex item quad matches the item');

    assert.deepStrictEqual(
        lineQuads[0].extendedItems[0], createQuad(10, 0, 30, 0, 30, 40, 10, 40),
        'The first flex item extended quad extends to the cross edge of the flex line');

    assert.deepStrictEqual(
        lineQuads[0].extendedItems[1], createQuad(40, 0, 60, 0, 60, 40, 40, 40),
        'The second flex item extended quad extends to the cross edge of the flex line');
  });

  it('creates correct quads with transformed layout', () => {
    const lineQuads = getLinesAndItemsQuads(
        createPathCommands(10, 70, 70, 10, 110, 50, 50, 110),
        [
          [
            createItem(30, 70, 50, 50, 60, 60, 40, 80),
            createItem(60, 40, 70, 30, 80, 40, 70, 50),
          ],
          [
            createItem(40, 80, 50, 70, 60, 80, 50, 90),
            createItem(50, 70, 80, 40, 90, 50, 60, 80),
          ],
        ],
        true, false);

    assert.deepStrictEqual(lineQuads[0].quad, createQuad(20, 80, 80, 20, 90, 30, 30, 90));
    assert.deepStrictEqual(lineQuads[0].extendedItems[0], createQuad(30, 70, 50, 50, 60, 60, 40, 80));
    assert.deepStrictEqual(lineQuads[0].extendedItems[1], createQuad(60, 40, 70, 30, 80, 40, 70, 50));

    assert.deepStrictEqual(lineQuads[1].quad, createQuad(30, 90, 90, 30, 100, 40, 40, 100));
    assert.deepStrictEqual(lineQuads[1].extendedItems[0], createQuad(40, 80, 50, 70, 60, 80, 50, 90));
    assert.deepStrictEqual(lineQuads[1].extendedItems[1], createQuad(50, 70, 80, 40, 90, 50, 60, 80));
  });
});

describe('getGapQuads', () => {
  it('does not return any cross gap if there is only 1 line', () => {
    const {crossGaps} = getGapQuads(
        {
          crossGap: 10,
          mainGap: 10,
          isHorizontalFlow: true,
          isReverse: false,
        },
        [{
          quad: createQuad(0, 0, 100, 0, 100, 100, 0, 100),
          items: [],
          extendedItems: [],
        }]);

    assert.strictEqual(crossGaps.length, 0, 'There cannot be cross gap if there is only one line');
  });

  it('does not return any main or cross gap if there actually isn\'t any gaps', () => {
    const {crossGaps, mainGaps} = getGapQuads(
        {
          crossGap: 0,
          mainGap: 0,
          isHorizontalFlow: true,
          isReverse: false,
        },
        [
          {
            quad: createQuad(0, 10, 100, 10, 100, 30, 0, 30),
            items: [
              createQuad(10, 10, 30, 10, 30, 30, 10, 30),
              createQuad(40, 10, 60, 10, 60, 30, 30, 40),
              createQuad(70, 10, 90, 10, 90, 30, 70, 30),
            ],
            extendedItems: [
              createQuad(10, 10, 30, 10, 30, 30, 10, 30),
              createQuad(40, 10, 60, 10, 60, 30, 30, 40),
              createQuad(70, 10, 90, 10, 90, 30, 70, 30),
            ],
          },
          {
            quad: createQuad(0, 40, 100, 40, 100, 70, 70, 0),
            items: [
              createQuad(10, 40, 70, 40, 70, 70, 10, 70),
              createQuad(80, 40, 90, 40, 90, 70, 80, 70),
            ],
            extendedItems: [
              createQuad(10, 40, 70, 40, 70, 70, 10, 70),
              createQuad(80, 40, 90, 40, 90, 70, 80, 70),
            ],
          },
        ]);

    assert.strictEqual(crossGaps.length, 0, 'No cross gap quads created when there is no cross gap');
    assert.strictEqual(mainGaps[0].length, 0, 'No main gap quads created when there is no main gap on the first line');
    assert.strictEqual(mainGaps[1].length, 0, 'No main gap quads created when there is no main gap on the second line');
  });

  it('returns 1 less gap than the number of lines and the number of items', () => {
    const {crossGaps, mainGaps} = getGapQuads(
        {
          crossGap: 10,
          mainGap: 10,
          isHorizontalFlow: true,
          isReverse: false,
        },
        [
          {
            quad: createQuad(0, 10, 100, 10, 100, 30, 0, 30),
            items: [
              createQuad(10, 10, 30, 10, 30, 30, 10, 30),
              createQuad(40, 10, 60, 10, 60, 30, 30, 40),
              createQuad(70, 10, 90, 10, 90, 30, 70, 30),
            ],
            extendedItems: [
              createQuad(10, 10, 30, 10, 30, 30, 10, 30),
              createQuad(40, 10, 60, 10, 60, 30, 30, 40),
              createQuad(70, 10, 90, 10, 90, 30, 70, 30),
            ],
          },
          {
            quad: createQuad(0, 40, 100, 40, 100, 70, 70, 0),
            items: [
              createQuad(10, 40, 70, 40, 70, 70, 10, 70),
              createQuad(80, 40, 90, 40, 90, 70, 80, 70),
            ],
            extendedItems: [
              createQuad(10, 40, 70, 40, 70, 70, 10, 70),
              createQuad(80, 40, 90, 40, 90, 70, 80, 70),
            ],
          },
          {
            quad: createQuad(0, 80, 100, 80, 100, 90, 90, 0),
            items: [
              createQuad(10, 80, 40, 80, 40, 90, 10, 90),
              createQuad(50, 80, 90, 80, 90, 90, 50, 90),
            ],
            extendedItems: [
              createQuad(10, 80, 40, 80, 40, 90, 10, 90),
              createQuad(50, 80, 90, 80, 90, 90, 50, 90),
            ],
          },
        ]);

    assert.strictEqual(crossGaps.length, 2, 'There are 2 cross gaps for 3 lines');
    assert.strictEqual(mainGaps[0].length, 2, 'There are 2 main gaps on the first line, which has 3 items');
    assert.strictEqual(mainGaps[1].length, 1, 'There is 1 main gap on the second line, which has 2 items');
    assert.strictEqual(mainGaps[2].length, 1, 'There is 1 main gap on the third line, which has 2 items');
  });
});

describe('getGapQuadBetweenQuads', () => {
  it('creates a quad between 2 quads stacked either vertically or horizontally, also when reversed', () => {
    const quadV = getGapQuadBetweenQuads(
        createQuad(0, 0, 60, 0, 60, 10, 0, 10),
        createQuad(0, 20, 60, 20, 60, 30, 0, 30),
        10,
        true,
        false,
    );
    assert.deepStrictEqual(quadV, createQuad(0, 10, 60, 10, 60, 20, 0, 20));

    const quadVReversed = getGapQuadBetweenQuads(
        createQuad(0, 20, 60, 20, 60, 30, 0, 30),
        createQuad(0, 0, 60, 0, 60, 10, 0, 10),
        10,
        true,
        true,
    );
    assert.deepStrictEqual(quadVReversed, quadV);

    const quadH = getGapQuadBetweenQuads(
        createQuad(0, 0, 10, 0, 10, 50, 50, 0),
        createQuad(20, 0, 30, 0, 30, 50, 50, 20),
        10,
        false,
        false,
    );
    assert.deepStrictEqual(quadH, createQuad(10, 0, 20, 0, 20, 50, 10, 50));

    const quadHReversed = getGapQuadBetweenQuads(
        createQuad(20, 0, 30, 0, 30, 50, 50, 20),
        createQuad(0, 0, 10, 0, 10, 50, 50, 0),
        10,
        false,
        true,
    );
    assert.deepStrictEqual(quadHReversed, quadH);
  });

  it('works when the gap is smaller than the distance between the quads', () => {
    const quad = getGapQuadBetweenQuads(
        createQuad(0, 0, 30, 0, 30, 20, 0, 20),
        createQuad(0, 50, 30, 50, 30, 70, 0, 70),
        10,
        true,
        false,
    );
    assert.deepStrictEqual(quad, createQuad(0, 30, 30, 30, 30, 40, 0, 40));
  });

  it('works when the quads are transformed', () => {
    const quad = getGapQuadBetweenQuads(
        createQuad(0, 20, 20, 0, 40, 20, 20, 40),
        createQuad(50, 70, 70, 50, 80, 60, 60, 80),
        10,
        true,
        false,
    );
    // The rounding of coordinates ends up 1px off, but this won't really matter visually, so the test just accounts for
    // it here.
    assert.deepStrictEqual(quad, createQuad(31, 51, 51, 31, 59, 39, 39, 59));
  });
});

describe('uniteQuads', () => {
  it('creates a quad that is big enough to contain the 2 passed quads', () => {
    const quad = uniteQuads(
        createQuad(0, 20, 10, 20, 10, 30, 0, 30),
        createQuad(20, 10, 40, 10, 40, 40, 20, 40),
        true,
        false,
    );
    assert.deepStrictEqual(quad, createQuad(0, 10, 40, 10, 40, 40, 0, 40));
  });

  it('can be called multiple times with the previously united quad to construct a flex line out of flex items', () => {
    let quad = uniteQuads(
        createQuad(0, 20, 10, 20, 10, 30, 0, 30),
        createQuad(20, 10, 40, 10, 40, 40, 20, 40),
        true,
        false,
    );
    quad = uniteQuads(
        quad,
        createQuad(60, 30, 90, 30, 90, 50, 60, 50),
        true,
        false,
    );
    quad = uniteQuads(
        quad,
        createQuad(130, 0, 180, 0, 180, 30, 130, 30),
        true,
        false,
    );
    assert.deepStrictEqual(quad, createQuad(0, 0, 180, 0, 180, 50, 0, 50));
  });

  it('also works when the quads are transformed', () => {
    const quad = uniteQuads(
        createQuad(0, 20, 20, 0, 40, 20, 20, 40),
        createQuad(50, 70, 70, 50, 80, 60, 60, 80),
        false,
        false,
    );
    assert.deepStrictEqual(quad, createQuad(0, 20, 20, 0, 80, 60, 60, 80));
  });
});

describe('growQuadToEdgesOf', () => {
  it('works horizontally', () => {
    const quad = growQuadToEdgesOf(
        createQuad(10, 10, 20, 10, 20, 20, 10, 20),
        createQuad(0, 0, 60, 0, 60, 30, 0, 30),
        true,
    );
    assert.deepStrictEqual(quad, createQuad(0, 10, 60, 10, 60, 20, 0, 20));
  });

  it('works vertically', () => {
    const quad = growQuadToEdgesOf(
        createQuad(10, 10, 20, 10, 20, 20, 10, 20),
        createQuad(0, 0, 60, 0, 60, 30, 0, 30),
        false,
    );
    assert.deepStrictEqual(quad, createQuad(10, 0, 20, 0, 20, 30, 10, 30));
  });

  it('works with transformed quads', () => {
    const quad = growQuadToEdgesOf(
        createQuad(30, 60, 60, 30, 80, 50, 50, 80),
        createQuad(10, 60, 60, 10, 100, 50, 50, 100),
        true,
    );
    assert.deepStrictEqual(quad, createQuad(20, 70, 70, 20, 90, 40, 40, 90));
  });
});

describe('getColinearPointAtDistance', () => {
  function assertPoint(p1: Position, p2: Position, distance: number, expected: Position): void {
    const point = getColinearPointAtDistance(p1, p2, distance);
    assert.deepStrictEqual({x: Math.round(point.x), y: Math.round(point.y)}, expected);
  }

  it('returns the right coordinates when the line is horizontal', () => {
    assertPoint({x: 0, y: 0}, {x: 10, y: 0}, 5, {x: 5, y: 0});
  });

  it('returns the right coordinates when the line is vertical', () => {
    assertPoint({x: 0, y: 0}, {x: 0, y: 10}, 5, {x: 0, y: 5});
  });

  it('returns the right coordinates when the line is at an angle', () => {
    assertPoint({x: 0, y: 0}, {x: 10, y: 10}, 5, {x: 4, y: 4});
  });

  it('also works when distance is longer than the p1-p2 segment', () => {
    assertPoint({x: 10, y: 20}, {x: 10, y: 40}, 50, {x: 10, y: 70});
  });
});

describe('distance', () => {
  function assertDistance(p1: Position, p2: Position, expected: number): void {
    const d = distance(p1, p2);
    assert.deepStrictEqual(Math.round(d), expected);
  }

  it('works', () => {
    assertDistance({x: 0, y: 0}, {x: 10, y: 0}, 10);
    assertDistance({x: 0, y: 0}, {x: 100, y: 0}, 100);
    assertDistance({x: 10, y: 0}, {x: 0, y: 0}, 10);
    assertDistance({x: 10, y: 10}, {x: 10, y: 30}, 20);
    assertDistance({x: 10, y: 10}, {x: 10, y: 5}, 5);
    assertDistance({x: 10, y: 10}, {x: 20, y: 20}, 14);
  });
});

describe('segmentContains', () => {
  it('works with straight segments', () => {
    assert.isFalse(segmentContains([{x: 0, y: 0}, {x: 0, y: 10}], {x: 10, y: 10}));
    assert.isFalse(segmentContains([{x: 0, y: 10}, {x: 0, y: 0}], {x: 10, y: 10}));
    assert.isFalse(segmentContains([{x: 10, y: 10}, {x: 100, y: 10}], {x: 10, y: 20}));
    assert.isFalse(segmentContains([{x: 10, y: 10}, {x: 10, y: 100}], {x: 10, y: 0}));

    assert.isTrue(segmentContains([{x: 0, y: 0}, {x: 0, y: 100}], {x: 0, y: 10}));
    assert.isTrue(segmentContains([{x: 0, y: 100}, {x: 0, y: 0}], {x: 0, y: 10}));
    assert.isTrue(segmentContains([{x: 10, y: 10}, {x: 20, y: 10}], {x: 15, y: 10}));
    assert.isTrue(segmentContains([{x: 20, y: 10}, {x: 10, y: 10}], {x: 15, y: 10}));
  });

  it('works with other segments', () => {
    assert.isFalse(segmentContains([{x: 0, y: 0}, {x: 10, y: 10}], {x: 10, y: 100}));
    assert.isFalse(segmentContains([{x: 20, y: 20}, {x: 30, y: 0}], {x: 10, y: 100}));

    assert.isTrue(segmentContains([{x: 0, y: 0}, {x: 100, y: 100}], {x: 50, y: 50}));
    assert.isTrue(segmentContains([{x: 0, y: 100}, {x: 100, y: 0}], {x: 50, y: 50}));
  });
});

describe('intersectSegments', () => {
  function assertIntersection(s1: Position[], s2: Position[], expected: Position): void {
    const point = intersectSegments(s1, s2);
    assert.deepStrictEqual({x: Math.round(point.x), y: Math.round(point.y)}, expected);
  }

  it('works when x or y is 0', () => {
    assertIntersection([{x: 0, y: 0}, {x: 0, y: 10}], [{x: 0, y: 5}, {x: 5, y: 5}], {x: 0, y: 5});
    assertIntersection([{x: 0, y: 0}, {x: 100, y: 0}], [{x: 50, y: 0}, {x: 50, y: 5}], {x: 50, y: 0});
    assertIntersection([{x: -5, y: 0}, {x: 5, y: 0}], [{x: 0, y: -5}, {x: 0, y: 5}], {x: 0, y: 0});
  });

  it('works in simple cases', () => {
    assertIntersection([{x: 5, y: 15}, {x: 15, y: 5}], [{x: 5, y: 5}, {x: 15, y: 15}], {x: 10, y: 10});
    assertIntersection([{x: 5, y: 10}, {x: 15, y: 10}], [{x: 10, y: 5}, {x: 10, y: 15}], {x: 10, y: 10});
  });

  it('works when segments only intersect outside their boundaries', () => {
    assertIntersection([{x: 5, y: 5}, {x: 5, y: 15}], [{x: 15, y: 10}, {x: 25, y: 10}], {x: 5, y: 10});
  });
});
