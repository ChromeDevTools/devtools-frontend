export type JsdocTypeLine = {
    delimiter: string;
    postDelimiter: string;
    rawType: string;
    initial: string;
    type: "JsdocTypeLine";
};
export type JsdocDescriptionLine = {
    delimiter: string;
    description: string;
    postDelimiter: string;
    initial: string;
    type: "JsdocDescriptionLine";
};
export type JsdocInlineTagNoType = {
    format: 'pipe' | 'plain' | 'prefix' | 'space';
    namepathOrURL: string;
    tag: string;
    text: string;
};
export type JsdocInlineTag = JsdocInlineTagNoType & {
    type: "JsdocInlineTag";
};
export type JsdocTag = {
    delimiter: string;
    description: string;
    descriptionLines: JsdocDescriptionLine[];
    initial: string;
    inlineTags: JsdocInlineTag[];
    name: string;
    postDelimiter: string;
    postName: string;
    postTag: string;
    postType: string;
    rawType: string;
    parsedType: import('jsdoc-type-pratt-parser').RootResult | null;
    tag: string;
    type: "JsdocTag";
    typeLines: JsdocTypeLine[];
};
export type Integer = number;
export type JsdocBlock = {
    delimiter: string;
    description: string;
    descriptionEndLine?: Integer;
    descriptionLines: JsdocDescriptionLine[];
    descriptionStartLine?: Integer;
    hasPreterminalDescription: 0 | 1;
    hasPreterminalTagDescription?: 1;
    initial: string;
    inlineTags: JsdocInlineTag[];
    lastDescriptionLine?: Integer;
    endLine: Integer;
    lineEnd: string;
    postDelimiter: string;
    tags: JsdocTag[];
    terminal: string;
    type: "JsdocBlock";
};
/**
 * Converts comment parser AST to ESTree format.
 * @param {import('./index.js').JsdocBlockWithInline} jsdoc
 * @param {import('jsdoc-type-pratt-parser').ParseMode} mode
 * @param {object} opts
 * @param {boolean} [opts.throwOnTypeParsingErrors]
 * @returns {JsdocBlock}
 */
export function commentParserToESTree(jsdoc: import('./index.js').JsdocBlockWithInline, mode: import('jsdoc-type-pratt-parser').ParseMode, { throwOnTypeParsingErrors }?: {
    throwOnTypeParsingErrors?: boolean | undefined;
}): JsdocBlock;
export namespace jsdocVisitorKeys {
    let JsdocBlock: string[];
    let JsdocDescriptionLine: never[];
    let JsdocTypeLine: never[];
    let JsdocTag: string[];
    let JsdocInlineTag: never[];
}
//# sourceMappingURL=commentParserToESTree.d.ts.map