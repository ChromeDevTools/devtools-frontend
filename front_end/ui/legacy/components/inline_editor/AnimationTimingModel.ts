// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../legacy.js';

// Provides a unified interface for both linear easing and cubic bezier
// models and handles the parsing for animation-timing texts.
export abstract class AnimationTimingModel {
  abstract asCSSText(): string;

  static parse(text: string): AnimationTimingModel|null {
    const bezierModel = UI.Geometry.CubicBezier.parse(text);
    if (bezierModel) {
      return bezierModel;
    }

    return null;
  }
}

export const LINEAR_BEZIER = UI.Geometry.LINEAR_BEZIER;
