export default estreeToString;
export type ESTreeToStringOptions = import('./index.js').ESTreeToStringOptions;
/**
 * @todo convert for use by escodegen (until may be patched to support
 *   custom entries?).
 * @param {import('./commentParserToESTree.js').JsdocBlock|
 *   import('./commentParserToESTree.js').JsdocDescriptionLine|
 *   import('./commentParserToESTree.js').JsdocTypeLine|
 *   import('./commentParserToESTree.js').JsdocTag|
 *   import('./commentParserToESTree.js').JsdocInlineTag|
 *   import('jsdoc-type-pratt-parser').RootResult
 * } node
 * @param {ESTreeToStringOptions} opts
 * @throws {Error}
 * @returns {string}
 */
declare function estreeToString(node: import('./commentParserToESTree.js').JsdocBlock | import('./commentParserToESTree.js').JsdocDescriptionLine | import('./commentParserToESTree.js').JsdocTypeLine | import('./commentParserToESTree.js').JsdocTag | import('./commentParserToESTree.js').JsdocInlineTag | import('jsdoc-type-pratt-parser').RootResult, opts?: ESTreeToStringOptions): string;
//# sourceMappingURL=estreeToString.d.ts.map