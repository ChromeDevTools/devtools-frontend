export declare const name = "removeXMLNS";
export declare const description = "removes xmlns attribute (for inline svg)";
/**
 * Remove the xmlns attribute when present.
 *
 * @example
 * <svg viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg">
 *   ↓
 * <svg viewBox="0 0 100 50">
 *
 * @author Ricardo Tomasi
 *
 * @type {import('../lib/types.js').Plugin}
 * @since 0.7.0
 */
export declare const fn: import('../lib/types.js').Plugin;
