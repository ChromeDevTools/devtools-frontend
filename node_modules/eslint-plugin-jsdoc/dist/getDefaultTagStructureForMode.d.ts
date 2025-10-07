export default getDefaultTagStructureForMode;
export type TagStructure = Map<string, Map<string, (string | boolean)>>;
/**
 * @typedef {Map<string, Map<string, (string|boolean)>>} TagStructure
 */
/**
 * @param {import('./jsdocUtils.js').ParserMode} mode
 * @returns {TagStructure}
 */
declare function getDefaultTagStructureForMode(mode: import("./jsdocUtils.js").ParserMode): TagStructure;
//# sourceMappingURL=getDefaultTagStructureForMode.d.ts.map