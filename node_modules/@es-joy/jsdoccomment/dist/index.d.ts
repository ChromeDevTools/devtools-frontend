export { visitorKeys as jsdocTypeVisitorKeys } from "jsdoc-type-pratt-parser";
export * from "jsdoc-type-pratt-parser";
export * from "./parseComment.js";
export * from "./commentParserToESTree.js";
export * from "./jsdoccomment.js";
export { default as commentHandler } from "./commentHandler.js";
export { default as toCamelCase } from "./toCamelCase.js";
export { default as estreeToString } from "./estreeToString.js";
export type InlineTag = import('./commentParserToESTree.js').JsdocInlineTagNoType & {
    start: number;
    end: number;
};
export type JsdocTagWithInline = import('comment-parser').Spec & {
    line?: import('./commentParserToESTree.js').Integer;
    inlineTags: (import('./commentParserToESTree.js').JsdocInlineTagNoType & {
        line?: import('./commentParserToESTree.js').Integer;
    })[];
};
/**
 * Expands on comment-parser's `Block` interface.
 */
export type JsdocBlockWithInline = {
    description: string;
    source: import('comment-parser').Line[];
    problems: import('comment-parser').Problem[];
    tags: JsdocTagWithInline[];
    inlineTags: (import('./commentParserToESTree.js').JsdocInlineTagNoType & {
        line?: import('./commentParserToESTree.js').Integer;
    })[];
};
export type ESTreeToStringOptions = {
    preferRawType?: boolean;
};
export type CommentHandler = (commentSelector: string, jsdoc: import('./index.js').JsdocBlockWithInline) => boolean;
//# sourceMappingURL=index.d.ts.map