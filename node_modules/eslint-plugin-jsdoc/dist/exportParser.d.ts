declare namespace _default {
    export { isUncommentedExport };
    export { parse };
}
export default _default;
export type ValueObject = {
    value: string;
};
export type CreatedNode = {
    type?: string;
    value?: ValueObject | import("eslint").Rule.Node | import("@typescript-eslint/types").TSESTree.Node;
    props: {
        [key: string]: CreatedNode | null;
    };
    special?: true;
    globalVars?: CreatedNode;
    exported?: boolean;
    ANONYMOUS_DEFAULT?: import("eslint").Rule.Node;
};
export type CreateSymbol = (node: import("eslint").Rule.Node | null, globals: CreatedNode, value: import("eslint").Rule.Node | import("@typescript-eslint/types").TSESTree.Node | null, scope?: CreatedNode | undefined, isGlobal?: boolean | SymbolOptions | undefined) => CreatedNode | null;
export type SymbolOptions = {
    simpleIdentifier?: boolean;
};
/**
 *
 * @param {import('eslint').Rule.Node} node
 * @param {import('eslint').SourceCode} sourceCode
 * @param {import('./rules/requireJsdoc.js').RequireJsdocOpts} opt
 * @param {import('./iterateJsdoc.js').Settings} settings
 * @returns {boolean}
 */
declare function isUncommentedExport(node: import("eslint").Rule.Node, sourceCode: import("eslint").SourceCode, opt: import("./rules/requireJsdoc.js").RequireJsdocOpts, settings: import("./iterateJsdoc.js").Settings): boolean;
/**
 *
 * @param {import('eslint').Rule.Node} ast
 * @param {import('eslint').Rule.Node} node
 * @param {import('./rules/requireJsdoc.js').RequireJsdocOpts} opt
 * @returns {CreatedNode}
 */
declare function parse(ast: import("eslint").Rule.Node, node: import("eslint").Rule.Node, opt: import("./rules/requireJsdoc.js").RequireJsdocOpts): CreatedNode;
//# sourceMappingURL=exportParser.d.ts.map