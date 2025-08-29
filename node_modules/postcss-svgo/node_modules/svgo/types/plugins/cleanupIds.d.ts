/**
 * @typedef CleanupIdsParams
 * @property {boolean=} remove
 * @property {boolean=} minify
 * @property {string[]=} preserve
 * @property {string[]=} preservePrefixes
 * @property {boolean=} force
 */
export const name: "cleanupIds";
export const description: "removes unused IDs and minifies used";
/**
 * Remove unused and minify used IDs (only if there are no `<style>` or
 * `<script>` nodes).
 *
 * @author Kir Belevich
 *
 * @type {import('../lib/types.js').Plugin<CleanupIdsParams>}
 */
export const fn: import("../lib/types.js").Plugin<CleanupIdsParams>;
export type CleanupIdsParams = {
    remove?: boolean | undefined;
    minify?: boolean | undefined;
    preserve?: string[] | undefined;
    preservePrefixes?: string[] | undefined;
    force?: boolean | undefined;
};
