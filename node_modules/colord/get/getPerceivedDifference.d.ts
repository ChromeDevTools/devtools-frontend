import { LabaColor } from "../types";
/**
 * Calculates the perceived color difference according to [Delta E2000](https://en.wikipedia.org/wiki/Color_difference#CIEDE2000).
 *
 * ΔE - (Delta E, dE) The measure of change in visual perception of two given colors.
 *
 * Delta E is a metric for understanding how the human eye perceives color difference.
 * The term delta comes from mathematics, meaning change in a variable or function.
 * The suffix E references the German word Empfindung, which broadly means sensation.
 *
 * On a typical scale, the Delta E value will range from 0 to 100.
 *
 * | Delta E | Perception                             |
 * |---------|----------------------------------------|
 * | <= 1.0  | Not perceptible by human eyes          |
 * | 1 - 2   | Perceptible through close observation  |
 * | 2 - 10  | Perceptible at a glance                |
 * | 11 - 49 | Colors are more similar than opposite  |
 * | 100     | Colors are exact opposite              |
 *
 * [Source](http://www.brucelindbloom.com/index.html?Eqn_DeltaE_CIE2000.html)
 * [Read about Delta E](https://zschuessler.github.io/DeltaE/learn/#toc-delta-e-2000)
 */
export declare function getDeltaE00(color1: LabaColor, color2: LabaColor): number;
