// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {applyMatrixToPoint, buildPath, emptyBounds} from '../../../inspector_overlay/highlight_common.js';

describe('highlight common helper', () => {
  it('can build a path and set bounds', () => {
    const bounds = emptyBounds();
    const highlightPath = ['M', 100, 60, 'L', 420, 60, 'L', 420, 204, 'L', 100, 204, 'Z'];
    buildPath(highlightPath, bounds, 1);

    assert.strictEqual(bounds.minX, 100);
    assert.strictEqual(bounds.minY, 60);
    assert.strictEqual(bounds.maxX, 420);
    assert.strictEqual(bounds.maxY, 204);
    assert.deepStrictEqual(bounds.leftmostXForY, {'60': 100, '204': 100});
    assert.deepStrictEqual(bounds.bottommostYForX, {'100': 204, '420': 204});
    assert.deepStrictEqual(bounds.rightmostXForY, {'60': 420, '204': 420});
    assert.deepStrictEqual(bounds.topmostYForX, {'100': 60, '420': 60});
  });

  it('can map points using writing-mode matrices', () => {
    const point = {x: 0, y: 0};
    const matrix = new DOMMatrix();

    assert.deepStrictEqual(
        applyMatrixToPoint(point, matrix),
        {x: 0, y: 0},
        'The identity matrix does not move the point',
    );

    point.x = 10;
    point.y = 10;
    matrix.translateSelf(10, 10, 0);
    assert.deepStrictEqual(
        applyMatrixToPoint(point, matrix),
        {x: 20, y: 20},
        'A simple translation matrix does transform a point',
    );
  });
});
