// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../legacy.js';

import {CSSLinearEasingModel} from './CSSLinearEasingModel.js';

// Provides a unified interface for both linear easing and cubic bezier
// models and handles the parsing for animation-timing texts.
export abstract class AnimationTimingModel {
  abstract asCSSText(): string;

  static parse(text: string): AnimationTimingModel|null {
    // Try to parse as a CSSLinearEasingModel first.
    // The reason is: `linear` keyword is valid in both
    // models, however we want to treat it as a `CSSLinearEasingModel`
    // for visualizing in animation timing tool.
    const cssLinearEasingModel = CSSLinearEasingModel.parse(text);
    if (cssLinearEasingModel) {
      return cssLinearEasingModel;
    }

    return UI.Geometry.CubicBezier.parse(text) || null;
  }
}

export const LINEAR_BEZIER = UI.Geometry.LINEAR_BEZIER;
