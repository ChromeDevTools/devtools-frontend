import * as Geometry from '../../../../models/geometry/geometry.js';
/**
 * Provides a unified interface for both linear easing and cubic bezier
 * models and handles the parsing for animation-timing texts.
 **/
export declare abstract class AnimationTimingModel {
    abstract asCSSText(): string;
    static parse(text: string): AnimationTimingModel | null;
}
export declare const LINEAR_BEZIER: Geometry.CubicBezier;
