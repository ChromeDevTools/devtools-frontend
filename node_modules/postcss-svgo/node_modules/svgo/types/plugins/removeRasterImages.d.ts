export const name: "removeRasterImages";
export const description: "removes raster images";
/**
 * Remove raster images references in <image>.
 *
 * @see https://bugs.webkit.org/show_bug.cgi?id=63548
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin}
 */
export const fn: import("../lib/types.js").Plugin;
