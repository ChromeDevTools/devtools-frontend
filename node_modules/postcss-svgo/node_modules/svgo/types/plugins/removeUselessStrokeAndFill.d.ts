/**
 * @typedef RemoveUselessStrokeAndFillParams
 * @property {boolean=} stroke
 * @property {boolean=} fill
 * @property {boolean=} removeNone
 */
export const name: "removeUselessStrokeAndFill";
export const description: "removes useless stroke and fill attributes";
/**
 * Remove useless stroke and fill attrs.
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<RemoveUselessStrokeAndFillParams>}
 */
export const fn: import("../lib/types.js").Plugin<RemoveUselessStrokeAndFillParams>;
export type RemoveUselessStrokeAndFillParams = {
    stroke?: boolean | undefined;
    fill?: boolean | undefined;
    removeNone?: boolean | undefined;
};
