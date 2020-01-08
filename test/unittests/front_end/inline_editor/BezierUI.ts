// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {BezierUI} from '../../../../front_end/inline_editor/BezierUI.js';

describe('BezierUI', () => {
  it('can be instantiated successfully', () => {
    const testWidth = 1;
    const testHeight = 2;
    const testMarginTop = 3;
    const testRadius = 4;
    const testLinearLine = true;
    const bezierUI = new BezierUI(testWidth, testHeight, testMarginTop, testRadius, testLinearLine);
    assert.equal(bezierUI.width, testWidth, 'width was not set or retrieved correctly');
    assert.equal(bezierUI.height, testHeight, 'height was not set or retrieved correctly');
    assert.equal(bezierUI.marginTop, testMarginTop, 'margin top was not set or retrieved correctly');
    assert.equal(bezierUI.radius, testRadius, 'radius was not set or retrieved correctly');
    assert.equal(bezierUI.linearLine, testLinearLine, 'linear line value was not set or retrieved correctly');
  });

  // TODO continue writing tests here or use another describe block
});
