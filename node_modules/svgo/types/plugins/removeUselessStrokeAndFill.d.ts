export type RemoveUselessStrokeAndFillParams = {
    stroke?: boolean | undefined;
    fill?: boolean | undefined;
    removeNone?: boolean | undefined;
};
/**
 * @typedef RemoveUselessStrokeAndFillParams
 * @property {boolean=} stroke
 * @property {boolean=} fill
 * @property {boolean=} removeNone
 */
export declare const name = "removeUselessStrokeAndFill";
export declare const description = "removes useless stroke and fill attributes";
/**
 * Remove useless stroke and fill attrs.
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<RemoveUselessStrokeAndFillParams>}
 * @since 0.1.8
 */
export declare const fn: import('../lib/types.js').Plugin<RemoveUselessStrokeAndFillParams>;
