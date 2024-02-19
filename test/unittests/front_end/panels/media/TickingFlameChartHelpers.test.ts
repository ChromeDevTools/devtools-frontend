// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as MediaModule from '../../../../../front_end/panels/media/media.js';

function assertParameters(
    bounds: MediaModule.TickingFlameChartHelpers.Bounds, low: number, high: number, min: number, max: number,
    range: number) {
  assert.closeTo(bounds.low, low, 0.01);
  assert.closeTo(bounds.high, high, 0.01);
  assert.closeTo(bounds.min, min, 0.01);
  assert.closeTo(bounds.max, max, 0.01);
  assert.closeTo(bounds.range, range, 0.01);
}

describe('TickingFlameChartTests', () => {
  let Media: typeof MediaModule;
  before(async () => {
    Media = await import('../../../../../front_end/panels/media/media.js');
  });

  it('checks that the formatter works correctly', () => {
    assert.strictEqual(Media.TickingFlameChartHelpers.formatMillisecondsToSeconds(901, 0), '1 s');
    assert.strictEqual(Media.TickingFlameChartHelpers.formatMillisecondsToSeconds(901, 1), '0.9 s');
    assert.strictEqual(Media.TickingFlameChartHelpers.formatMillisecondsToSeconds(901, 2), '0.9 s');
    assert.strictEqual(Media.TickingFlameChartHelpers.formatMillisecondsToSeconds(901, 3), '0.901 s');

    assert.strictEqual(Media.TickingFlameChartHelpers.formatMillisecondsToSeconds(89129, 2), '89.13 s');
  });

  it('checks that the bounds are correct', () => {
    const bounds = new Media.TickingFlameChartHelpers.Bounds(0, 100, 1000, 100);
    assertParameters(bounds, 0, 100, 0, 100, 100);
  });

  it('checks zoom toggle works correctly', () => {
    const bounds = new Media.TickingFlameChartHelpers.Bounds(0, 1000, 1000, 100);
    bounds.zoomOut(1, 0.5);  // does nothing, because it hasn't been zoomed yet.
    assertParameters(bounds, 0, 1000, 0, 1000, 1000);

    bounds.zoomIn(1, 0.5);  // zooms in 1 tick right in the middle
    assertParameters(bounds, 45.45, 954.54, 0, 1000, 909.09);

    bounds.zoomOut(1, 0.5);  // zooms out 1 tick right in the middle
    assertParameters(bounds, 0, 1000, 0, 1000, 1000);
  });

  it('checks zoom different locations works correctly', () => {
    const bounds = new Media.TickingFlameChartHelpers.Bounds(0, 1000, 1000, 100);
    bounds.zoomOut(1, 0.5);  // does nothing, because its already at max.
    assertParameters(bounds, 0, 1000, 0, 1000, 1000);

    bounds.zoomIn(1, 0.5);  // zooms in 1 tick right in the middle
    assertParameters(bounds, 45.45, 954.54, 0, 1000, 909.09);

    bounds.zoomOut(1, 0);  // zooms out 1 tick on the left edge
    assertParameters(bounds, 45.45, 1000, 0, 1000, 954.54);
  });

  it('checks adding to the bounds range', () => {
    const bounds = new Media.TickingFlameChartHelpers.Bounds(0, 1000, 1000, 100);

    bounds.addMax(10);  // Should push up the max because we're zoomed out.
    assertParameters(bounds, 0, 1010, 0, 1010, 1010);

    bounds.zoomIn(1, 0);  // zoom in at the beginning to move away from the live edge
    assertParameters(bounds, 0, 918.18, 0, 1010, 918.18);

    bounds.addMax(10);  // adding to max should not move the view window, only the max size.
    assertParameters(bounds, 0, 918.18, 0, 1020, 918.18);

    bounds.zoomOut(1, 0);
    bounds.zoomOut(1, 0);  // extra zoom to make sure it's reset.
    assertParameters(bounds, 0, 1020, 0, 1020, 1020);

    bounds.zoomIn(1, 1);  // zoom in on the leading edge now
    assertParameters(bounds, 92.72, 1020, 0, 1020, 927.28);

    bounds.addMax(10);  // it won't scroll because the viewport size is less than the max scroll size
    assertParameters(bounds, 92.72, 1020, 0, 1030, 927.28);

    bounds.zoomOut(1, 1);
    bounds.zoomOut(1, 0.5);  // extra zoom to make sure it's reset.
    assertParameters(bounds, 0, 1030, 0, 1030, 1030);

    bounds.addMax(2000);  // push bounds way up, so zoom won't push us below the threshold.
    assertParameters(bounds, 0, 3030, 0, 3030, 3030);

    bounds.zoomIn(1, 1);  // zoom in on the leading edge now
    assertParameters(bounds, 275.45, 3030, 0, 3030, 2754.55);

    bounds.addMax(10);  // the viewport range should change now.
    assertParameters(bounds, 275.45, 3040, 0, 3040, 2764.55);
  });
});
