// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import {blendColors} from '../../../../front_end/common/ColorUtils.js';

it('is able to blend two colors according to alpha blending', () => {
  const firstColor = [1, 0, 0, 1];
  const secondColor = [0, 0, 1, 1];
  const result = blendColors(firstColor, secondColor);
  assert.deepEqual(result, [1, 0, 0, 1], 'colors were not blended successfully');
});
