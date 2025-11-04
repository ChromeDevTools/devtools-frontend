// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Geometry from '../../../../models/geometry/geometry.js';
import { CSSLinearEasingModel } from './CSSLinearEasingModel.js';
/**
 * Provides a unified interface for both linear easing and cubic bezier
 * models and handles the parsing for animation-timing texts.
 **/
export class AnimationTimingModel {
    static parse(text) {
        // Try to parse as a CSSLinearEasingModel first.
        // The reason is: `linear` keyword is valid in both
        // models, however we want to treat it as a `CSSLinearEasingModel`
        // for visualizing in animation timing tool.
        const cssLinearEasingModel = CSSLinearEasingModel.parse(text);
        if (cssLinearEasingModel) {
            return cssLinearEasingModel;
        }
        return Geometry.CubicBezier.parse(text) || null;
    }
}
export const LINEAR_BEZIER = Geometry.LINEAR_BEZIER;
//# sourceMappingURL=AnimationTimingModel.js.map