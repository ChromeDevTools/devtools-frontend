export default alignTransform;
export type TypelessInfo = {
    hasNoTypes: boolean;
    maxNamedTagLength: import("./iterateJsdoc.js").Integer;
    maxUnnamedTagLength: import("./iterateJsdoc.js").Integer;
};
export type Width = {
    name: import("./iterateJsdoc.js").Integer;
    start: import("./iterateJsdoc.js").Integer;
    tag: import("./iterateJsdoc.js").Integer;
    type: import("./iterateJsdoc.js").Integer;
};
/**
 * @param {{
 *   customSpacings: import('../src/rules/checkLineAlignment.js').CustomSpacings,
 *   tags: string[],
 *   indent: string,
 *   preserveMainDescriptionPostDelimiter: boolean,
 *   wrapIndent: string,
 *   disableWrapIndent: boolean,
 * }} cfg
 * @returns {(
 *   block: import('comment-parser').Block
 * ) => import('comment-parser').Block}
 */
declare function alignTransform({ customSpacings, disableWrapIndent, indent, preserveMainDescriptionPostDelimiter, tags, wrapIndent, }: {
    customSpacings: import("../src/rules/checkLineAlignment.js").CustomSpacings;
    tags: string[];
    indent: string;
    preserveMainDescriptionPostDelimiter: boolean;
    wrapIndent: string;
    disableWrapIndent: boolean;
}): (block: import("comment-parser").Block) => import("comment-parser").Block;
//# sourceMappingURL=alignTransform.d.ts.map