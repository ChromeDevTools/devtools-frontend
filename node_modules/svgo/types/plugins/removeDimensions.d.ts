export declare const name = "removeDimensions";
export declare const description = "removes width and height in presence of viewBox (opposite to removeViewBox)";
/**
 * Remove width/height attributes and add the viewBox attribute if it's missing
 *
 * @example
 * <svg width="100" height="50" />
 *   ↓
 * <svg viewBox="0 0 100 50" />
 *
 * @author Benny Schudel
 *
 * @type {import('../lib/types.js').Plugin}
 * @since 0.5.3
 */
export declare const fn: import('../lib/types.js').Plugin;
