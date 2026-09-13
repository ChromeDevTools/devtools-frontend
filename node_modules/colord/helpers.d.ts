export declare const isPresent: (value: unknown) => boolean;
export declare const round: (number: number, digits?: number, base?: number) => number;
export declare const floor: (number: number, digits?: number, base?: number) => number;
/**
 * Clamps a value between an upper and lower bound.
 * We use ternary operators because it makes the minified code
 * is 2 times shorter then `Math.min(Math.max(a,b),c)`
 * NaN is clamped to the lower bound
 */
export declare const clamp: (number: number, min?: number, max?: number) => number;
/**
 * Processes and clamps a degree (angle) value properly.
 * Any `NaN` or `Infinity` will be converted to `0`.
 * Examples: -1 => 359, 361 => 1, 360 => 0
 *
 * Deliberately not the canonical `((degrees % 360) + 360) % 360`. That form
 * perturbs values already in range: `0.4` comes back as `0.39999999999997726`,
 * and 69% of hues in [0, 360) shift by up to 6e-14 degrees. Far too small to
 * change any 8-bit output, but the two-step form below is exact for every
 * in-range value and the same length, so nothing is traded for it.
 */
export declare const clampHue: (degrees: number) => number;
/**
 * Rounds a hue and keeps it inside [0, 360).
 * Rounding alone can produce exactly 360 (a raw hue of 359.6 rounds up), which
 * every consumer then has to special-case, so the wrap belongs here.
 * Examples: 359.6 => 0, 12.4 => 12
 */
export declare const roundHue: (degrees: number, digits?: number) => number;
/**
 * Converts a hue value to degrees from 0 to 360 inclusive.
 */
export declare const parseHue: (value: string, unit?: string) => number;
