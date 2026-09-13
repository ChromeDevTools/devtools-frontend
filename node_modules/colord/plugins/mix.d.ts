import { AnyColor } from "../types";
import { Plugin } from "../extend";
import { MixingColorSpace } from "../manipulate/mix";
declare module "../colord" {
    interface Colord {
        /**
         * Produces a mixture of two colors and returns a new Colord instance.
         * Mixes through CIE LAB color space by default;
         * pass "rgb" to interpolate RGB channels instead
         * (the way browsers and design tools composite translucent layers).
         */
        mix(color2: AnyColor | Colord, ratio?: number, space?: MixingColorSpace): Colord;
        /**
         * Generates a tints palette based on original color.
         */
        tints(count?: number, space?: MixingColorSpace): Colord[];
        /**
         * Generates a shades palette based on original color.
         */
        shades(count?: number, space?: MixingColorSpace): Colord[];
        /**
         * Generates a tones palette based on original color.
         */
        tones(count?: number, space?: MixingColorSpace): Colord[];
    }
}
/**
 * A plugin adding a color mixing utilities.
 */
declare const mixPlugin: Plugin;
export default mixPlugin;
