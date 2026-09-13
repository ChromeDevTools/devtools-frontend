export declare const name = "cleanupEnableBackground";
export declare const description = "remove or cleanup enable-background attribute when possible";
/**
 * Remove or cleanup enable-background attr which coincides with a width/height
 * box.
 *
 * @see https://www.w3.org/TR/SVG11/filters.html#EnableBackgroundProperty
 * @example
 * <svg width="100" height="50" enable-background="new 0 0 100 50">
 *   ⬇
 * <svg width="100" height="50">
 * @author Kir Belevich
 * @type {import('../lib/types.js').Plugin}
 * @since 0.0.4
 */
export declare const fn: import('../lib/types.js').Plugin;
