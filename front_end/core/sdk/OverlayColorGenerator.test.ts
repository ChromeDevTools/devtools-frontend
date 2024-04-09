// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../common/common.js';

import * as SDK from './sdk.js';

describe('OverlayColorGenerator', () => {
  it('generates colors for at least 100 iterations', () => {
    const generator = new SDK.OverlayColorGenerator.OverlayColorGenerator();
    let prevColor: Common.Color.Color|undefined;
    for (let i = 0; i < 100; i++) {
      const color = generator.next();
      if (prevColor) {
        assert.notDeepEqual(color.asString(), prevColor.asString());
      }
      prevColor = color;
    }
  });
});
